import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StatusBar,
    Platform,
    Image 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native';
import { HOST } from '../../../configs/Apis';

const SavedJobs = ({ navigation }) => {
    const [jobs, setJobs] = useState([]);
    const [likedJobs, setLikedJobs] = useState([]);
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
            fetchSavedJobs();
            checkUnreadNotifications(); 
        }, [])
    );

    const fetchSavedJobs = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            
            const userId = await AsyncStorage.getItem('current_user_id');
            const savedLikesStr = await AsyncStorage.getItem(`likedJobs_${userId}`); 
            const savedLikes = savedLikesStr ? JSON.parse(savedLikesStr) : [];
            
            setLikedJobs(savedLikes);

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const jobsRes = await axios.get(`${HOST}/api/jobs/`, config);
            const jobData = jobsRes.data.results ? jobsRes.data.results : jobsRes.data;

            const filtered = jobData.filter(job => savedLikes.includes(job.id));
            setJobs(filtered);

        } catch (error) {
            console.error("Lỗi API Saved Jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = async (jobId) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post(`${HOST}/api/jobs/${jobId}/like/`, {}, config);

            let newLikes;
            if (response.data.liked) {
                newLikes = [...likedJobs, jobId];
            } else {
                newLikes = likedJobs.filter(id => id !== jobId);
            }
            
            setLikedJobs(newLikes);
            
            const userId = await AsyncStorage.getItem('current_user_id');
            await AsyncStorage.setItem(`likedJobs_${userId}`, JSON.stringify(newLikes)); 

            setJobs(prevJobs => prevJobs.filter(job => newLikes.includes(job.id)));

        } catch (error) {
            console.error("Lỗi thả tim:", error.message);
        }
    };

    const renderJobItem = ({ item }) => {
        const shortLocation = item.location ? item.location.split(',').pop().trim() : "Chưa cập nhật";
        const companyName = item.employer_name || "Công ty tuyển dụng";

        const avatarUrl = item.employer_avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('JobDetail', { job: item, isLikedInitially: true })}
                className="bg-white p-5 rounded-2xl mb-4 mx-4 shadow-sm border border-blue-200"
            >
                <View className="flex-row items-start mb-4">
                    <View className="w-16 h-16 rounded-2xl border border-gray-100 overflow-hidden mr-4 bg-gray-50 shadow-sm justify-center items-center">
                        <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                    </View>
                    
                    <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                            <Text className="text-lg font-bold text-gray-800 flex-1 mr-2" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleLike(item.id); }} className="p-1 -mt-1 -mr-2">
                                <MaterialIcons name="favorite" size={26} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                        
                        <View className="flex-row items-center mt-1">
                            <MaterialIcons name="business" size={16} color="#6b7280" />
                            <Text className="text-gray-500 font-semibold ml-1 flex-1" numberOfLines={1}>
                                {companyName}
                            </Text> 
                        </View>
                    </View>
                </View>
                
                <View className="flex-row justify-between items-center mt-1">
                    <View className="flex-row items-center bg-green-50 px-2 py-1.5 rounded-lg border border-green-400">
                        <MaterialIcons name="attach-money" size={16} color="#10b981" />
                        <Text className="text-green-500 font-bold">{item.salary}</Text>
                    </View>
                    <View className="flex-row items-center flex-1 justify-end ml-2 ">
                        <MaterialIcons name="location-on" size={14} color="#9ca3af" />
                        <Text className="text-gray-700 text-sm ml-1" numberOfLines={1} ellipsizeMode="tail">{shortLocation}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 ">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} 
                className="pb-4 px-4 shadow-lg z-10 flex-row items-center justify-center"
            >
                <Text className="text-white text-xl font-bold">Việc làm đã lưu</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10"  />
            ) : (
                <FlatList 
                    data={jobs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderJobItem}
                    showsVerticalScrollIndicator={false}
                    className="pt-4"
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <MaterialIcons name="favorite-border" size={60} color="#ccc" />
                            <Text className="text-center text-gray-400 mt-4 text-base">Bạn chưa lưu công việc nào.</Text>
                        </View>
                    }
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('Home')} className="items-center">
                    <MaterialIcons name="home" size={28} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Trang chủ</Text>
                </TouchableOpacity>

                <TouchableOpacity className="items-center">
                    <MaterialIcons name="favorite" size={26} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Đã lưu</Text>
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

                <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="items-center">
                    <MaterialIcons name="account-circle" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SavedJobs;