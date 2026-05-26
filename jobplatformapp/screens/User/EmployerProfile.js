import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, StatusBar, Alert, Platform } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview'; 
import { HOST } from '../../configs/Apis';

const EmployerProfile = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false); 
    const [hasUnread, setHasUnread] = useState(false); 

    const [paymentUrl, setPaymentUrl] = useState(null); 
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    
    // 🔴 STATE ĐIỀU KHIỂN BẬT/TẮT HỘP THOẠI THANH TOÁN
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    

    const checkUnreadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userId = await AsyncStorage.getItem('current_user_id');
            if (!token || !userId) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const [appRes, sysRes] = await Promise.all([
                axios.get(`${HOST}/api/applications/`, config),
                axios.get(`${HOST}/api/notifications/`, config)
            ]);
            
            const appsData = appRes.data.results || appRes.data;
            const myCandidates = appsData.filter(app => {
                const jobEmployerId = app.job?.employer?.id || app.job?.employer || app.job?.employer_id;
                return String(jobEmployerId) === String(userId);
            });

            const sysData = sysRes.data.results || sysRes.data;

            const savedReadIds = await AsyncStorage.getItem(`read_notifications_employer_${userId}`);
            const readIds = savedReadIds ? JSON.parse(savedReadIds) : [];
            
            const unreadAppExists = myCandidates.some(item => {
                const currentKey = `APP_${item.id}_${item.updated_date || item.created_date}`;
                return !readIds.includes(currentKey);
            });

            const unreadSysExists = sysData.some(item => {
                const currentKey = `SYS_${item.id}_${item.updated_date || item.created_date}`;
                return !readIds.includes(currentKey);
            });

            setHasUnread(unreadAppExists || unreadSysExists);
            
        } catch (error) {
            console.error("Lỗi kiểm tra dấu chấm đỏ:", error.message);
            setHasUnread(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const fetchUserProfile = async () => {
            try {
                const token = await AsyncStorage.getItem('access_token');
                if (!token) {
                    navigation.navigate('Login');
                    return;
                }
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get(`${HOST}/api/users/current-user/`, config);
                setUser(response.data);
            } catch (error) {
                console.error("Lỗi tải hồ sơ:", error);
                Alert.alert("Lỗi", "Không thể tải thông tin công ty.");
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();

            checkUnreadNotifications(); 
        }, [])
    );

    const handlePickAndUploadAvatar = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Thông báo", "Bạn cần cấp quyền truy cập ảnh để đổi Logo!");
            return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (pickerResult.canceled) return;
        const selectedImage = pickerResult.assets[0];

        try {
            setUploading(true);
            const token = await AsyncStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('avatar', {
                uri: selectedImage.uri,
                name: `company_logo_${Date.now()}.jpg`,
                type: 'image/jpeg',
            });

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            };

            const response = await axios.patch(`${HOST}/api/users/current-user/`, formData, config);
            setUser(response.data); 
            Alert.alert("Thành công", "Đã cập nhật logo công ty.");

        } catch (error) {
            console.error("Lỗi upload logo:", error.response?.data || error.message);
            Alert.alert("Lỗi", "Không thể cập nhật ảnh lúc này.");
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
            { text: "Hủy", style: "cancel" },
            { 
                text: "Đăng xuất", 
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem('access_token');
                    await AsyncStorage.removeItem('current_user_id'); 
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
            }
        ]);
    };

    // 🔴 SỬA HÀM NÀY ĐỂ BẬT MODAL THAY VÌ DÙNG ALERT
    const handleUpgradeVIP = async () => {
        if (user?.is_vip) {
            Alert.alert("Thông báo", "Tài khoản của bạn đã là VIP rồi!");
            return;
        }
        // Hiển thị giao diện Modal đẹp
        setPaymentModalVisible(true);
    };

    const processPayment = async (method) => {
        setIsPaymentLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            if (method === 'PAYPAL') {
                const res = await axios.post(`${HOST}/api/users/create-paypal/`, {}, config);
                if (res.data.approval_url) {
                    setPaymentUrl(res.data.approval_url);
                }
            } else if (method === 'MOMO') {
                const res = await axios.post(`${HOST}/api/users/create-momo/`, {}, config);
                if (res.data.payUrl) {
                    setPaymentUrl(res.data.payUrl);
                }
            }
        } catch (error) {
            console.error(`Lỗi tạo thanh toán ${method}:`, error);
            Alert.alert("Lỗi", "Không thể khởi tạo thanh toán. Vui lòng thử lại sau.");
        } finally {
            setIsPaymentLoading(false);
        }
    };

    const handleNavigationStateChange = async (navState) => {
        const { url } = navState;

        if (url.includes('vicareer.app/payment-success') && url.includes('paymentId')) {
            setPaymentUrl(null);
            const getParam = (name) => {
                const results = new RegExp(`[?&]${name}=([^&#]*)`).exec(url);
                return results === null ? null : decodeURIComponent(results[1]);
            };
            const paymentId = getParam('paymentId');
            const PayerID = getParam('PayerID');

            if (paymentId && PayerID) {
                try {
                    const token = await AsyncStorage.getItem('access_token');
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.post(`${HOST}/api/users/execute-paypal/`, { paymentId, PayerID }, config);

                    Alert.alert("Thành công 🎉", "Nâng cấp VIP thành công! Các tin tuyển dụng của bạn giờ đã được đánh dấu Nổi Bật.");
                    setUser(prev => ({...prev, is_vip: true}));
                } catch (err) {
                    Alert.alert("Lỗi", "Thanh toán thành công nhưng chưa thể cập nhật trạng thái VIP.");
                }
            }
        } 
        
        else if (url.includes('vicareer.app/payment-success') && url.includes('resultCode')) {
            setPaymentUrl(null);
            
            const getParam = (name) => {
                const results = new RegExp(`[?&]${name}=([^&#]*)`).exec(url);
                return results === null ? null : decodeURIComponent(results[1]);
            };
            
            const resultCode = getParam('resultCode');
            const amount = getParam('amount');
            const orderId = getParam('orderId');

            try {
                const token = await AsyncStorage.getItem('access_token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const res = await axios.post(
                    `${HOST}/api/users/execute-momo/`, 
                    { resultCode, amount, orderId }, 
                    config
                );

                Alert.alert("Thành công 🎉", "Nâng cấp VIP qua MoMo thành công!");
                setUser(prev => ({...prev, is_vip: true}));
                
            } catch (err) {
                Alert.alert("Thất bại", err.response?.data?.error || "Giao dịch MoMo không thành công.");
            }
        }
        
        else if (url.includes('vicareer.app/payment-cancel')) {
            setPaymentUrl(null);
            Alert.alert("Đã hủy", "Bạn đã hủy quá trình thanh toán.");
        }
    };

    if (loading) return (
        <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#162E93" />
        </View>
    );

    if (paymentUrl) {
        return (
            <View style={{ flex: 1, marginTop: statusBarHeight }}>
                <View className="flex-row justify-between p-4 bg-[#162E93] items-center">
                    <Text className="text-white font-bold text-lg">Thanh toán bảo mật</Text>
                    <TouchableOpacity onPress={() => setPaymentUrl(null)} className="p-1">
                        <MaterialIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
                <WebView 
                    source={{ uri: paymentUrl }} 
                    onNavigationStateChange={handleNavigationStateChange}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#162E93" />
                        </View>
                    )}
                />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} className="pb-5 px-6 rounded-b-[10px] shadow-xl">
                <View className="flex-row items-center mt-2">
                    <TouchableOpacity onPress={handlePickAndUploadAvatar} disabled={uploading} className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 justify-center items-center">
                        <Image 
                            source={{ uri: user?.avatar 
                                ? (user.avatar.startsWith('http') ? user.avatar : `${HOST}${user.avatar}`) 
                                : 'https://ui-avatars.com/api/?name=Company&background=FBBF24&color=fff&size=120' 
                            }} 
                            className="w-full h-full rounded-full" 
                        />
                        <View className="absolute bottom-0 right-0 bg-yellow-400 p-1.5 rounded-full border-2 border-white">
                            <MaterialIcons name="photo-camera" size={14} color="#162E93" />
                        </View>
                        {uploading && (
                            <View className="absolute w-full h-full rounded-full bg-black/40 items-center justify-center">
                                <ActivityIndicator size="small" color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <View className="flex-1 ml-5 items-start">
                        <Text className="text-white text-2xl font-bold">{user?.first_name} {user?.last_name}</Text>
                        <Text className="text-white/70 text-sm font-medium mt-1 mb-2" numberOfLines={1}>{user?.email}</Text>
                        <View className="bg-yellow-400 px-3 py-1 rounded-full mt-1">
                            <Text className="text-[#162E93] font-bold text-xs">NHÀ TUYỂN DỤNG</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-2 pt-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text className="text-gray-700 font-bold mb-4 ml-1">THÔNG TIN CÔNG TY</Text>
                <View className="bg-white rounded-xl p-5 shadow-sm mb-6 border border-yellow-500">
                    <TouchableOpacity className="flex-row items-center py-2">
                        <MaterialIcons name="business" size={24} color="#162E93" />
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Tên công ty</Text>
                        <Text className="text-gray-500 mr-2 font-medium" numberOfLines={1}>{user?.company_name || "Công ty TNHH ViCareer"}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity className="flex-row items-center py-2">
                        <MaterialIcons name="phone" size={24} color="#162E93" />
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Hotline tuyển dụng</Text>
                        <Text className="text-gray-500 mr-2 font-medium">{user?.phone_number || "Chưa cập nhật"}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity className="flex-row items-center py-2">
                        <MaterialIcons name="location-on" size={24} color="#162E93" />
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Địa chỉ văn phòng</Text>
                        <Text className="text-gray-500 mr-2 font-medium" numberOfLines={1}>{user?.location || "Chưa cập nhật"}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">TÍNH NĂNG CAO CẤP</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-yellow-500">
                    {user?.is_vip ? (
                        <View className="flex-row items-center py-2 opacity-60">
                            <View className="p-2 bg-green-50 rounded-full">
                                <MaterialIcons name="verified" size={24} color="#10b981" />
                            </View>
                            <Text className="flex-1 ml-4 text-green-600 font-bold text-base">Tài khoản Doanh nghiệp VIP</Text>
                            <MaterialIcons name="check" size={24} color="#10b981" />
                        </View>
                    ) : (
                        <TouchableOpacity onPress={handleUpgradeVIP} disabled={isPaymentLoading} className="flex-row items-center py-2">
                            <View className="p-2 bg-yellow-50 rounded-full">
                                {isPaymentLoading ? <ActivityIndicator size="small" color="#eab308" /> : <MaterialIcons name="stars" size={24} color="#eab308" />}
                            </View>
                            <Text className="flex-1 ml-4 text-yellow-600 font-bold text-base">Nâng cấp tài khoản VIP</Text>
                            <Text className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg overflow-hidden mr-2">10$</Text>
                            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                        </TouchableOpacity>
                    )}

                    <Divider />
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('TransactionHistory')} 
                        className="flex-row items-center py-2"
                    >
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="history" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Lịch sử giao dịch</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-700 font-bold mb-4 ml-1">CÀI ĐẶT TÀI KHOẢN</Text>
                <View className="bg-white rounded-xl p-5 shadow-sm mb-10 border border-yellow-500">
                    <TouchableOpacity className="flex-row items-center py-2">
                        <MaterialIcons name="lock-outline" size={24} color="#162E93" />
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Đổi mật khẩu</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-2">
                        <MaterialIcons name="logout" size={24} color="#ef4444" />
                        <Text className="flex-1 ml-4 text-red-500 font-bold text-base">Đăng xuất</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* 🔴 HỘP THOẠI THANH TOÁN (MODAL) VỚI TAILWIND */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isPaymentModalVisible}
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center">
                    <View className="w-[85%] bg-white rounded-2xl p-6 items-center shadow-lg">
                        <Text className="text-2xl font-bold text-gray-800 mb-2">Nâng Cấp VIP</Text>
                        <Text className="text-sm text-gray-500 mb-6 text-center">Vui lòng chọn cổng thanh toán an toàn</Text>

                        {/* Nút MoMo (Hồng) */}
                        <TouchableOpacity 
                            className="w-full py-3.5 rounded-xl items-center mb-3 bg-[#AE2070] flex-row justify-center"
                            onPress={() => {
                                setPaymentModalVisible(false);
                                processPayment('MOMO');
                            }}
                        >
                            <Text className="text-white text-base font-bold">Thanh toán qua MoMo</Text>
                        </TouchableOpacity>

                        {/* Nút PayPal (Xanh dương) */}
                        <TouchableOpacity 
                            className="w-full py-3.5 rounded-xl items-center mb-3 bg-[#003087] flex-row justify-center"
                            onPress={() => {
                                setPaymentModalVisible(false);
                                processPayment('PAYPAL');
                            }}
                        >
                            <Text className="text-white text-base font-bold">Thanh toán qua PayPal</Text>
                        </TouchableOpacity>

                        {/* Nút Hủy */}
                        <TouchableOpacity 
                            className="mt-2 py-2 px-5"
                            onPress={() => setPaymentModalVisible(false)}
                        >
                            <Text className="text-gray-500 text-base font-semibold">Hủy bỏ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Bottom Tab Bar */}
            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('EmployerHome')} className="items-center">
                    <MaterialIcons name="dashboard" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Bảng tin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('EmployerJobManager')} className="items-center">
                    <MaterialIcons name="work-outline" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Quản lý tin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('EmployerCandidates')} className="items-center">
                    <MaterialIcons name="people-alt" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Ứng viên</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('EmployerNotifications')} className="items-center">
                    <View className="relative">
                        <MaterialIcons name="notifications" size={26} color="#9ca3af" />
                        {hasUnread && <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-[1.5px] border-white" />}
                    </View>
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Thông báo</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center">
                    <MaterialIcons name="business-center" size={28} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const Divider = () => <View className="h-[1px] bg-gray-100 my-4 ml-12" />;

export default EmployerProfile;