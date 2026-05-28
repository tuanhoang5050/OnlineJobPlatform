import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native'; 
import { HOST } from '../../../configs/Apis'; 

const EmployerJobManager = ({ navigation }) => {
    const [jobs, setJobs] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [hasUnread, setHasUnread] = useState(false); 

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const fetchMyJobs = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
            const currentUser = userRes.data;

            const jobsRes = await axios.get(`${HOST}/api/jobs/`, config); 
            const allJobs = jobsRes.data.results ? jobsRes.data.results : jobsRes.data;

            const myJobs = allJobs.filter(job => 
                job.employer === currentUser.id || job.employer_id === currentUser.id || job.user === currentUser.id
            );
            setJobs(myJobs);
        } catch (error) {
            console.error("Lỗi tải danh sách quản lý tin:", error);
        } finally {
            setLoading(false);
        }
    };

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
            fetchMyJobs();
            checkUnreadNotifications(); 
        }, [])
    );

    const filteredJobs = jobs.filter(job => job.title.toLowerCase().includes(searchText.toLowerCase()));

    const renderJobItem = ({ item }) => {
        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('EditJobPost', { job: item })}
                className="bg-white p-5 rounded-2xl mb-4 mx-4 shadow-sm border border-blue-200"
            >
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-bold text-gray-800 flex-1 mr-4">{item.title}</Text>
                    <View className="bg-yellow-100 p-1.5 rounded-lg">
                        <MaterialIcons name="edit" size={20} color="#d97706" />
                    </View>
                </View>

                
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <MaterialIcons name="people-outline" size={18} color="#6b7280" />
                        <Text className="text-gray-500 font-semibold ml-1">
                            Xem danh sách nộp 
                        </Text> 
                    </View>
                    
                    <View className="flex-row items-center bg-purple-50 px-2 py-1 rounded-lg">
                        <MaterialIcons name="visibility" size={16} color="#8b5cf6" />
                        <Text className="text-purple-600 font-bold text-xs ml-1">
                            {item.views_count || 0} lượt xem
                        </Text>
                    </View>
                </View>
                
                <View className="flex-row justify-between items-center mt-2">
                    <View className="flex-row items-center bg-green-50 px-2 py-1.5 rounded-lg border border-green-400">
                        <MaterialIcons name="attach-money" size={16} className="text-green-500" />
                        <Text className="text-green-500 font-bold">{item.salary}</Text>
                    </View>
                    <Text className="text-gray-500 text-sm italic">Hạn nộp: {item.deadline ? item.deadline.split('-').reverse().join('/') : "Chưa rõ"}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} className="pb-5 px-4 shadow-lg z-10">
                <Text className="text-white text-xl font-bold text-center mb-4">Quản lý tin tuyển dụng</Text>
                <View className="flex-row bg-white px-4 py-3 rounded-xl items-center shadow-inner">
                    <MaterialIcons name="search" size={28} color="#162E93" />
                    <TextInput 
                        placeholder="Tìm tin bạn đã đăng..."
                        value={searchText}
                        onChangeText={setSearchText}
                        className="flex-1 text-gray-700 ml-2 font-medium"
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10" />
            ) : (
                <FlatList 
                    data={filteredJobs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderJobItem}
                    showsVerticalScrollIndicator={false}
                    className="pt-5"
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListEmptyComponent={<Text className="text-center text-gray-400 mt-20">Bạn chưa đăng tin tuyển dụng nào.</Text>}
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('EmployerHome')} className="items-center">
                    <MaterialIcons name="dashboard" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Bảng tin</Text>
                </TouchableOpacity>

                <TouchableOpacity className="items-center">
                    <MaterialIcons name="work" size={28} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Quản lý tin</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerCandidates')} className="items-center">
                    <MaterialIcons name="people-alt" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Ứng viên</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerNotifications')} className="items-center">
                    <View className="relative">
                        <MaterialIcons name="notifications" size={26} color="#9ca3af" />
                        
                        {hasUnread && (
                            <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-[1.5px] border-white" />
                        )}
                    </View>
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Thông báo</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerProfile')} className="items-center">
                    <MaterialIcons name="business-center" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default EmployerJobManager;