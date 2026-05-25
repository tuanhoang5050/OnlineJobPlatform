import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native';
import { HOST } from '../../configs/Apis';

// Hàm xử lý định dạng cho Đơn ứng tuyển (Application)
const getAppNotificationDetail = (app) => {
    const jobTitle = app.job?.title || 'một vị trí';
    const candidateName = app.candidate?.first_name 
        ? `${app.candidate.first_name} ${app.candidate.last_name || ''}` 
        : app.candidate?.username || 'Một ứng viên';
    
    if (Number(app.status) === 0) {
        return {
            title: '🎉 Có ứng viên mới!',
            body: `${candidateName} vừa ứng tuyển vào vị trí "${jobTitle}" của bạn. Hãy vào xem ngay nhé!`,
            icon: 'person-add-alt-1', iconColor: '#3b82f6', bgColor: 'bg-blue-50', borderColor: 'border-blue-100',
            navTarget: 'EmployerCandidates' // Biến lưu màn hình sẽ chuyển tới khi bấm
        };
    } else if (Number(app.status) === 1) {
        return {
            title: 'Đã xem hồ sơ',
            body: `Bạn đã xem hồ sơ của ${candidateName} cho vị trí "${jobTitle}".`,
            icon: 'visibility', iconColor: '#f59e0b', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100',
            navTarget: 'EmployerCandidates'
        };
    } else if (Number(app.status) === 2) {
        return {
            title: 'Đã chấp nhận',
            body: `Bạn đã chấp nhận hồ sơ của ${candidateName}. Đừng quên liên hệ lịch phỏng vấn nhé!`,
            icon: 'check-circle', iconColor: '#10b981', bgColor: 'bg-green-50', borderColor: 'border-green-200',
            navTarget: 'EmployerCandidates'
        };
    } else {
        return {
            title: 'Đã từ chối',
            body: `Bạn đã từ chối hồ sơ của ${candidateName}.`,
            icon: 'cancel', iconColor: '#ef4444', bgColor: 'bg-red-50', borderColor: 'border-red-100',
            navTarget: 'EmployerCandidates'
        };
    }
};

// Hàm xử lý định dạng cho Thông báo hệ thống (Notification)
const getSystemNotificationDetail = (sysNotif) => {
    if (sysNotif.type === 'SYSTEM_APPROVAL') {
        return {
            title: sysNotif.title,
            body: sysNotif.body,
            icon: 'verified-user', iconColor: '#10b981', bgColor: 'bg-green-50', borderColor: 'border-green-300',
            navTarget: 'EmployerProfile' // Duyệt xong thì chuyển qua Profile xem cho sướng
        };
    } else {
        return {
            title: sysNotif.title,
            body: sysNotif.body,
            icon: 'gpp-bad', iconColor: '#ef4444', bgColor: 'bg-red-50', borderColor: 'border-red-300',
            navTarget: 'EmployerProfile'
        };
    }
};

const EmployerNotifications = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const fetchNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userId = await AsyncStorage.getItem('current_user_id');
            if (!token || !userId) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // 1. Lấy thông tin user hiện tại
            const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
            const currentHrId = userRes.data.id;

            // 2. GỌI SONG SONG 2 API: Danh sách ứng tuyển VÀ Danh sách thông báo hệ thống
            const [appRes, sysRes] = await Promise.all([
                axios.get(`${HOST}/api/applications/`, config),
                axios.get(`${HOST}/api/notifications/`, config) // 🔴 API TỪ BẢNG NOTIFICATION
            ]);

            // 3. Lọc danh sách ứng viên (giữ nguyên logic cũ)
            const appsData = appRes.data.results || appRes.data;
            const myCandidates = appsData.filter(app => {
                const jobEmployerId = app.job?.employer?.id || app.job?.employer || app.job?.employer_id;
                return jobEmployerId === currentHrId;
            }).map(app => ({ ...app, notifType: 'APP' })); // Đánh dấu loại là 'APP'

            // 4. Lấy danh sách thông báo hệ thống
            const sysData = sysRes.data.results || sysRes.data;
            const sysNotifs = sysData.map(sys => ({ ...sys, notifType: 'SYS' })); // Đánh dấu loại là 'SYS'

            // 5. GỘP CẢ 2 MẢNG LẠI & SẮP XẾP MỚI NHẤT
            const mixedNotifications = [...myCandidates, ...sysNotifs].sort((a, b) => {
                const dateA = new Date(a.updated_date || a.created_date);
                const dateB = new Date(b.updated_date || b.created_date);
                return dateB - dateA;
            });

            setNotifications(mixedNotifications);

            // LOGIC CHECK CHƯA ĐỌC
            const savedReadKeys = await AsyncStorage.getItem(`read_notifications_employer_${userId}`);
            const readKeys = savedReadKeys ? JSON.parse(savedReadKeys) : [];

            const unreadExists = mixedNotifications.some(item => {
                // Ta gộp id và notifType làm key để không bị trùng (vd: APP_12, SYS_12)
                const currentKey = `${item.notifType}_${item.id}_${item.updated_date || item.created_date}`;
                return !readKeys.includes(currentKey);
            });
            
            setHasUnread(unreadExists);

        } catch (error) {
            console.error("Lỗi tải thông báo nhà tuyển dụng:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAllAsRead = async () => {
        try {
            if (notifications.length === 0) return; 
            const userId = await AsyncStorage.getItem('current_user_id');
            if (!userId) return;

            // Đánh dấu tất cả của Employer
            const allKeys = notifications.map(item => `${item.notifType}_${item.id}_${item.updated_date || item.created_date}`);
            await AsyncStorage.setItem(`read_notifications_employer_${userId}`, JSON.stringify(allKeys));

            setHasUnread(false);
            Alert.alert("Thành công", "Đã đánh dấu đọc tất cả thông báo.");
        } catch (error) {
            Alert.alert("Lỗi", "Không thể đánh dấu đã đọc.");
        }
    };

    const renderNotificationItem = ({ item }) => {
        // Tùy theo loại (APP hay SYS) mà ta gọi hàm định dạng phù hợp
        const detail = item.notifType === 'APP' ? getAppNotificationDetail(item) : getSystemNotificationDetail(item);
        const dateObj = new Date(item.updated_date || item.created_date);
        const dateString = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()} - ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        
        return (
            <TouchableOpacity 
                // 🔴 Bấm vào sẽ chuyển qua trang tương ứng với loại thông báo
                onPress={() => navigation.navigate(detail.navTarget)}
                className={`p-4 mb-3 mx-4 rounded-2xl border ${detail.bgColor} ${detail.borderColor} flex-row shadow-sm`}
            >
                <View className="mr-4 mt-1">
                    <MaterialIcons name={detail.icon} size={28} color={detail.iconColor} />
                </View>
                <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-base mb-1">{detail.title}</Text>
                    <Text className="text-gray-600 text-sm leading-5">{detail.body}</Text>
                    <Text className="text-gray-400 text-xs mt-2 font-medium">{dateString}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} className="pb-5 px-4 shadow-lg z-10 flex-row items-center justify-between">
                <Text className="text-white text-xl font-bold ml-2">Thông báo Tuyển dụng</Text>
                <TouchableOpacity onPress={handleMarkAllAsRead} className="p-2 bg-white/20 rounded-full">
                    <MaterialIcons name="done-all" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10" />
            ) : (
                <FlatList 
                    data={notifications}
                    keyExtractor={(item, index) => `${item.notifType}_${item.id}_${index}`}
                    renderItem={renderNotificationItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#162E93']} />}
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 px-6">
                            <MaterialIcons name="notifications-off" size={60} color="#d1d5db" />
                            <Text className="text-center text-gray-500 mt-4 text-base">
                                Bạn chưa có thông báo nào.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* THANH ĐIỀU HƯỚNG DÀNH RIÊNG CHO EMPLOYER */}
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

                <TouchableOpacity className="items-center">
                    <View>
                        <MaterialIcons name="notifications" size={28} color="#162E93" />
                        {hasUnread && <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-[1.5px] border-white" />}
                    </View>
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Thông báo</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerProfile')} className="items-center">
                    <MaterialIcons name="business-center" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default EmployerNotifications;