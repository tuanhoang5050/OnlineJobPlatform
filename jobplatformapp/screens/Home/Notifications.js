import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    StatusBar, 
    Platform,
    RefreshControl,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { HOST } from '../../configs/Apis';

// Hàm helper để sinh nội dung thông báo dựa trên trạng thái (status)
const getNotificationDetail = (app) => {
    const jobTitle = app.job?.title || 'một vị trí';
    const companyName = app.job?.employer_name || app.employer?.company_name || 'công ty';
    const status = Number(app.status);

    switch (status) {
        case 0:
            return {
                title: 'Ứng tuyển thành công',
                body: `Bạn đã nộp hồ sơ vào vị trí "${jobTitle}" tại ${companyName}. Vui lòng kiên nhẫn chờ phản hồi từ nhà tuyển dụng nhé.`,
                icon: 'check-circle',
                iconColor: '#3b82f6',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-100'
            };
        case 1:
            return {
                title: 'Hồ sơ đã được xem',
                body: `Nhà tuyển dụng tại ${companyName} đã xem hồ sơ của bạn cho vị trí "${jobTitle}".`,
                icon: 'visibility',
                iconColor: '#f59e0b',
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-100'
            };
        case 2:
            return {
                title: 'Chúc mừng! Bạn đã trúng tuyển 🎉',
                body: `Tuyệt vời! Hồ sơ ứng tuyển vị trí "${jobTitle}" tại ${companyName} của bạn đã được chấp nhận. HR sẽ sớm liên hệ với bạn.`,
                icon: 'sentiment-very-satisfied',
                iconColor: '#10b981',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
            };
        case 3:
            return {
                title: 'Thông báo kết quả',
                body: `Rất tiếc, hồ sơ của bạn chưa phù hợp với vị trí "${jobTitle}" tại ${companyName} trong đợt tuyển dụng này. Đừng nản lòng và thử sức ở các cơ hội khác nhé!`,
                icon: 'info',
                iconColor: '#ef4444',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-100'
            };
        default:
            return {
                title: 'Cập nhật trạng thái',
                body: `Trạng thái hồ sơ của bạn cho vị trí "${jobTitle}" đã có sự thay đổi.`,
                icon: 'notifications',
                iconColor: '#6b7280',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200'
            };
    }
};

const Notifications = ({ navigation }) => {
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
            const response = await axios.get(`${HOST}/api/applications/`, config);
            
            const appsData = response.data.results ? response.data.results : response.data;
            const sortedApps = appsData.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
            
            setNotifications(sortedApps);

            const savedReadIds = await AsyncStorage.getItem(`read_notifications_${userId}`);
            const readIds = savedReadIds ? JSON.parse(savedReadIds) : [];

            const unreadExists = sortedApps.some(item => {
                // 🔴 ĐÃ SỬA LỖI HỔNG: Chỉ báo chấm đỏ khi 'status' thay đổi
                const currentKey = `${item.id}_status_${item.status}`;
                return !readIds.includes(currentKey);
            });
            
            setHasUnread(unreadExists);

        } catch (error) {
            console.error("Lỗi tải thông báo:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAllAsRead = async () => {
        try {
            if (notifications.length === 0) return; 

            const userId = await AsyncStorage.getItem('current_user_id');
            if (!userId) return;

            // 🔴 ĐÃ SỬA LỖI HỔNG: Lưu theo định dạng status
            const allIds = notifications.map(item => `${item.id}_status_${item.status}`);
            await AsyncStorage.setItem(`read_notifications_${userId}`, JSON.stringify(allIds));

            setHasUnread(false);
            Alert.alert("Thành công", "Đã đánh dấu đọc tất cả các thông báo.");
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc tất cả:", error);
            Alert.alert("Lỗi", "Không thể đánh dấu đã đọc.");
        }
    };

    const renderNotificationItem = ({ item }) => {
        const detail = getNotificationDetail(item);
        const dateObj = new Date(item.updated_date || item.created_date);
        const dateString = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('AppliedJobs')}
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
            
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} 
                className="pb-5 px-4 shadow-lg z-10 flex-row items-center justify-between"
            >
                <Text className="text-white text-xl font-bold ml-2">Thông báo của bạn</Text>
                <TouchableOpacity onPress={handleMarkAllAsRead} className="p-2 bg-white/20 rounded-full">
                    <MaterialIcons name="done-all" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10" />
            ) : (
                <FlatList 
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderNotificationItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#162E93']} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 px-6">
                            <MaterialIcons name="notifications-off" size={60} color="#d1d5db" />
                            <Text className="text-center text-gray-500 mt-4 text-base">
                                Bạn chưa có thông báo nào. Hãy ứng tuyển thêm các công việc mới nhé!
                            </Text>
                        </View>
                    }
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('Home')} className="items-center">
                    <MaterialIcons name="home" size={26} color="#9ca3af" />
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

                <TouchableOpacity className="items-center">
                    <View>
                        <MaterialIcons name="notifications" size={28} color="#162E93" />
                        {hasUnread && (
                            <View className="absolute right-0.5 top-0 bg-red-500 w-3 h-3 rounded-full border border-white" />
                        )}
                    </View>
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Thông báo</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="items-center">
                    <MaterialIcons name="account-circle" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Notifications;