import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Image, 
    ScrollView, 
    ActivityIndicator, 
    StatusBar, 
    Alert, 
    Modal,
    Platform,
    Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; 
import * as ImagePicker from 'expo-image-picker';
import { HOST } from '../../../configs/Apis';

const Profile = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false); 

    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', content: '' });

    const [hasUnread, setHasUnread] = useState(false);

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const checkUnreadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userId = await AsyncStorage.getItem('current_user_id');
            
            if (!token || !userId) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${HOST}/api/applications/`, config);
            
            const appsData = response.data.results ? response.data.results : response.data;
            
            const savedReadIds = await AsyncStorage.getItem(`read_notifications_${userId}`);
            const readIds = savedReadIds ? JSON.parse(savedReadIds) : [];
            
            const unreadExists = appsData.some(item => {
               
                const currentKey = `${item.id}_status_${item.status}`;
                return !readIds.includes(currentKey);
            });
            setHasUnread(unreadExists);
            
        } catch (error) {
            console.log("Lỗi check thông báo chưa đọc:", error.message);
        }
    };

    useFocusEffect(
        useCallback(() => {
            checkUnreadNotifications();
        }, [])
    );

    useEffect(() => {
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
                Alert.alert("Lỗi", "Không thể tải thông tin hồ sơ.");
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, []);

    const handlePickAndUploadAvatar = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Thông báo", "Bạn cần cấp quyền truy cập ảnh để đổi Avatar!");
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
                name: `avatar_${Date.now()}.jpg`,
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
            Alert.alert("Thành công", "Đã cập nhật ảnh đại diện.");

        } catch (error) {
            console.error("Lỗi upload avatar:", error.response?.data || error.message);
            Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện lúc này.");
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

    const openInfoModal = (title, content) => {
        setModalContent({ title, content });
        setInfoModalVisible(true);
    };

    const handleOpenMyCV = async () => {
        const cvUrl = user?.cv_file; 
    
        if (!cvUrl) {
            Alert.alert("Thông báo", "Bạn chưa cập nhật file CV nào trên hệ thống.");
            return;
        }
    
        const fullUrl = cvUrl.startsWith('http') ? cvUrl : `${HOST}${cvUrl}`;
    
        try {
            const supported = await Linking.canOpenURL(fullUrl);
            if (supported) {
                await Linking.openURL(fullUrl);
            } else {
                Alert.alert("Lỗi", "Thiết bị của bạn không hỗ trợ mở liên kết này.");
            }
        } catch (error) {
            Alert.alert("Lỗi", "Đã xảy ra lỗi khi cố gắng mở file CV.");
            console.error("Lỗi mở CV:", error);
        }
    };

    if (loading) return (
        <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#162E93" />
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 20 }} 
                className="pb-6 px-6 rounded-b-[24px] shadow-xl"
            >
                <View className="flex-row items-center mt-2">
                    
                    <TouchableOpacity 
                        onPress={handlePickAndUploadAvatar}
                        disabled={uploading}
                        className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 justify-center items-center"
                    >
                        <Image 
                            source={{ uri: user?.avatar 
                                ? (user.avatar.startsWith('http') ? user.avatar : `${HOST}${user.avatar}`) 
                                : 'https://ui-avatars.com/api/?name=User&background=FBBF24&color=fff&size=120' 
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
                        <Text className="text-white text-2xl font-bold">
                            {user?.first_name} {user?.last_name}
                        </Text>
                        <Text className="text-white/70 text-sm font-medium mt-1 mb-2" numberOfLines={1}>
                            {user?.email}
                        </Text>
                        
                        <View className="bg-yellow-400 px-3 py-1 rounded-full mt-1">
                            <Text className="text-[#162E93] font-bold text-xs">
                                {user?.role === 'CANDIDATE' ? 'ỨNG VIÊN' : 'NHÀ TUYỂN DỤNG'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView 
                className="flex-1 px-4 pt-5" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">QUẢN LÝ HỒ SƠ & VIỆC LÀM</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-blue-100">
                    <TouchableOpacity onPress={handleOpenMyCV} className="flex-row items-center py-2">
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="description" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">CV của tôi</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity onPress={() => navigation.navigate('AppliedJobs')} className="flex-row items-center py-2">
                        <View className="p-2 bg-green-50 rounded-full">
                            <MaterialIcons name="assignment-turned-in" size={24} color="#10b981" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Việc làm đã ứng tuyển</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity onPress={() => navigation.navigate('SavedJobs')} className="flex-row items-center py-2">
                        <View className="p-2 bg-red-50 rounded-full">
                            <MaterialIcons name="favorite" size={24} color="#ef4444" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Việc làm đã lưu</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">TÍNH NĂNG CAO CẤP</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-blue-100">
                    <TouchableOpacity onPress={() => Alert.alert("VIP", "Chuyển đến trang thanh toán gói VIP")} className="flex-row items-center py-2">
                        <View className="p-2 bg-yellow-50 rounded-full">
                            <MaterialIcons name="stars" size={24} color="#eab308" />
                        </View>
                        <Text className="flex-1 ml-4 text-yellow-600 font-bold text-base">Nâng cấp tài khoản VIP</Text>
                        <Text className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg overflow-hidden mr-2">HOT</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">THÔNG TIN CÁ NHÂN</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-blue-100">
                    <TouchableOpacity className="flex-row items-center py-2">
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="phone" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Số điện thoại</Text>
                        <Text className="text-gray-500 mr-2 font-medium">{user?.phone_number || "Chưa cập nhật"}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity className="flex-row items-center py-2">
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="person" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Giới tính</Text>
                        <Text className="text-gray-500 mr-2 font-medium">
                            {user?.sex === 'NAM' ? 'Nam' : (user?.sex === 'NU' ? 'Nữ' : 'Khác')}
                        </Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity className="flex-row items-center py-2">
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="location-on" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Địa chỉ</Text>
                        <Text className="text-gray-500 mr-2 font-medium" numberOfLines={1}>
                            {user?.location || "Chưa cập nhật"}
                        </Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">THÔNG TIN CHUNG</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-blue-100">
                    <TouchableOpacity 
                        onPress={() => openInfoModal(
                            "Về ViCareer", 
                            "ViCareer là nền tảng tuyển dụng thông minh thế hệ mới, giúp bạn tìm kiếm công việc phù hợp với năng lực và định hướng tương lai. Phiên bản hiện tại: v1.0.0"
                        )} 
                        className="flex-row items-center py-2"
                    >
                        <View className="p-2 bg-gray-50 rounded-full">
                            <MaterialIcons name="info-outline" size={24} color="#6b7280" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Về ViCareer</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity 
                        onPress={() => openInfoModal(
                            "Điều khoản dịch vụ", 
                            "1. ViCareer cung cấp nền tảng kết nối ứng viên và nhà tuyển dụng.\n2. Người dùng cam kết cung cấp thông vị trí chính xác, không vi phạm pháp luật.\n3. ViCareer có quyền từ chối cung cấp dịch vụ nếu phát hiện gian lận."
                        )} 
                        className="flex-row items-center py-2"
                    >
                        <View className="p-2 bg-gray-50 rounded-full">
                            <MaterialIcons name="article" size={24} color="#6b7280" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Điều khoản dịch vụ</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity 
                        onPress={() => openInfoModal(
                            "Chính sách bảo mật", 
                            "ViCareer cam kết bảo mật thông tin cá nhân và CV của bạn. Dữ liệu của bạn sẽ chỉ được cung cấp cho nhà tuyển dụng khi bạn trực tiếp ấn nút ứng tuyển. Hệ thống sử dụng công nghệ mã hóa hiện đại để bảo vệ tài khoản."
                        )} 
                        className="flex-row items-center py-2"
                    >
                        <View className="p-2 bg-gray-50 rounded-full">
                            <MaterialIcons name="security" size={24} color="#6b7280" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Chính sách bảo mật</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs tracking-wider">CÀI ĐẶT TÀI KHOẢN</Text>
                <View className="bg-white rounded-xl p-4 shadow-sm mb-10 border border-blue-100">
                    <TouchableOpacity className="flex-row items-center py-2">
                        <View className="p-2 bg-blue-50 rounded-full">
                            <MaterialIcons name="lock-outline" size={24} color="#162E93" />
                        </View>
                        <Text className="flex-1 ml-4 text-gray-700 font-semibold text-base">Đổi mật khẩu</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-2">
                        <View className="p-2 bg-red-50 rounded-full">
                            <MaterialIcons name="logout" size={24} color="#ef4444" />
                        </View>
                        <Text className="flex-1 ml-4 text-red-500 font-bold text-base">Đăng xuất</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={infoModalVisible}
                onRequestClose={() => setInfoModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                    <View className="bg-white w-11/12 rounded-3xl p-6 shadow-2xl">
                        <Text className="text-xl font-bold text-[#162E93] mb-4 text-center">{modalContent.title}</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            <Text className="text-gray-700 text-base leading-6 text-justify">
                                {modalContent.content}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity 
                            onPress={() => setInfoModalVisible(false)} 
                            className="mt-6 bg-[#162E93] py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Đã hiểu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('Home')} className="items-center">
                    <MaterialIcons name="home" size={28} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Trang chủ</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('SavedJobs')} className="items-center">
                    <MaterialIcons name="favorite-border" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Đã lưu</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('AppliedJobs')} className="items-center">
                    <MaterialIcons name="assignment-turned-in" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Đã nộp</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="items-center">
                    <View>
                        <MaterialIcons name="notifications" size={26} color="#9ca3af" />
                        {hasUnread && (
                            <View className="absolute right-0.5 top-0.5 bg-red-500 w-3 h-3 rounded-full border border-white" />
                        )}
                    </View>
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Thông báo</Text>
                </TouchableOpacity>

                <TouchableOpacity className="items-center">
                    <MaterialIcons name="account-circle" size={26} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const Divider = () => <View className="h-[1px] bg-gray-100 my-2 ml-12" />;

export default Profile;