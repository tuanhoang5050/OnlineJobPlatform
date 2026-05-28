import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StatusBar, 
    Alert,
    Platform,
    Image 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native';
import { HOST } from '../../../configs/Apis';

const AppliedJobs = ({ navigation }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
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
            fetchAppliedJobs();
            checkUnreadNotifications(); 
        }, [])
    );

    const fetchAppliedJobs = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const response = await axios.get(`${HOST}/api/applications/`, config);
            setApplications(response.data.results ? response.data.results : response.data);
            
        } catch (error) {
            console.error("Lỗi API Applied Jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 0: return { color: '#f59e0b', bg: 'bg-yellow-100', text: 'Đang chờ' };
            case 1: return { color: '#3b82f6', bg: 'bg-blue-100', text: 'Đã xem' };
            case 2: return { color: '#10b981', bg: 'bg-green-100', text: 'Đã nhận' };
            case 3: return { color: '#ef4444', bg: 'bg-red-100', text: 'Từ chối' };
            default: return { color: '#6b7280', bg: 'bg-gray-100', text: 'Không rõ' };
        }
    };

    const renderApplicationItem = ({ item }) => {
        const jobTitle = item.job?.title || item.job_title || `Công việc #${item.job}`;
        const statusConfig = getStatusStyle(item.status);
        const applyDate = new Date(item.created_date).toLocaleDateString('vi-VN');

        const companyName = item.job?.employer_name || "Công ty tuyển dụng";
        
        const avatarUrl = item.job?.employer_avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        return (
            <TouchableOpacity 
                onPress={() => {
                    if (item.job && typeof item.job === 'object') {
                        navigation.navigate('JobDetail', { 
                            job: item.job,
                            isAppliedInitially: true 
                        });
                    } else {
                        Alert.alert("Thông báo", "Không thể xem chi tiết công việc này do thiếu dữ liệu liên kết từ máy chủ.");
                    }
                }}
                className="bg-white p-5 rounded-2xl mb-4 mx-4 shadow-sm border border-blue-200"
            >
                <View className="flex-row items-center mb-3">
                    <View className="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden mr-4 bg-gray-50 shadow-sm justify-center items-center">
                        <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                    </View>
                    
                    <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                            <Text className="text-base font-bold text-gray-800 flex-1 mr-2" numberOfLines={2}>
                                {jobTitle}
                            </Text>
                            
                            <View className={`px-2 py-1 rounded-lg ${statusConfig.bg} self-start`}>
                                <Text style={{ color: statusConfig.color }} className="font-bold text-[10px]">
                                    {statusConfig.text}
                                </Text>
                            </View>
                        </View>

                        <Text className="text-gray-400 text-sm mt-0.5 font-semibold" numberOfLines={1}>
                            {companyName}
                        </Text>
                    </View>
                </View>
                
                <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-gray-100">
                    <View className="flex-row items-center">
                        <FontAwesome5 name="file-pdf" size={16} color="#ef4444" />
                        <Text className="text-gray-500 font-medium ml-2 text-sm">CV đã nộp</Text>
                    </View>
                    <View className="flex-row items-center">
                        <MaterialIcons name="access-time" size={16} color="#9ca3af" />
                        <Text className="text-gray-500 text-sm ml-1">{applyDate}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} 
                className="pb-4 px-4 shadow-lg z-10 flex-row items-center justify-center"
            >
                <Text className="text-white text-xl font-bold">Việc làm đã nộp</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10" />
            ) : (
                <FlatList 
                    data={applications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderApplicationItem}
                    showsVerticalScrollIndicator={false}
                    className="pt-4"
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <MaterialIcons name="assignment-late" size={60} color="#ccc" />
                            <Text className="text-center text-gray-400 mt-4 text-base">Bạn chưa nộp hồ sơ công việc nào.</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Home')} className="mt-4 bg-blue-100 px-6 py-2 rounded-xl">
                                <Text className="text-[#162E93] font-bold">Tìm việc ngay</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('Home')} className="items-center">
                    <MaterialIcons name="home" size={28} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Trang chủ</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('SavedJobs')} className="items-center">
                    <MaterialIcons name="favorite-border" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Đã lưu</Text>
                </TouchableOpacity>

                <TouchableOpacity className="items-center">
                    <MaterialIcons name="assignment" size={26} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Đã nộp</Text>
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

                <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="items-center">
                    <MaterialIcons name="account-circle" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AppliedJobs;