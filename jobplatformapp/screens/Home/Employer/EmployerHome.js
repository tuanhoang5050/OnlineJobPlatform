import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Alert, Platform } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native'; 
import { HOST } from '../../../configs/Apis'; 

const EmployerHome = ({ navigation }) => {
    const [user, setUser] = useState(null); 
    const [jobs, setJobs] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Tất cả'); 
    
    const [hasUnread, setHasUnread] = useState(false);

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                navigation.navigate('Login');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
            const currentUser = userRes.data;
            
            setUser(currentUser);

            const jobsRes = await axios.get(`${HOST}/api/jobs/`, config); 
            const allJobs = jobsRes.data.results ? jobsRes.data.results : jobsRes.data;

            const myJobs = allJobs.filter(job => 
                job.employer === currentUser.id || job.employer_id === currentUser.id || job.user === currentUser.id
            );
            setJobs(myJobs);
            

        } catch (error) {
            console.error("Lỗi API Employer Home:", error);
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
        React.useCallback(() => {
            fetchData();
            checkUnreadNotifications(); 
        }, [])
    );

   
    const filteredJobs = jobs.filter(job => {
        const matchSearch = job.title.toLowerCase().includes(searchText.toLowerCase());
        if (statusFilter === 'Tất cả') return matchSearch;
        
        const jobStatus = job.status || 'Đang tuyển'; 
        return matchSearch && jobStatus === statusFilter;
    });

    const renderJobItem = ({ item }) => {
       
        const isFeatured = (item.is_featured === true) && (user?.is_vip === true);

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('EditJobPost', { job: item })}
                
                className={`p-5 rounded-2xl mb-4 mx-4 shadow-sm ${isFeatured ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-white border border-blue-500'}`}
            >
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-4 flex-row items-center">
                        
                        {isFeatured && (
                            <Text className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">HOT</Text>
                        )}
                        <Text className={`text-lg font-bold ${isFeatured ? 'text-yellow-700' : 'text-[#162E93]'}`}>{item.title}</Text>
                    </View>
                    <TouchableOpacity className="p-1 bg-blue-50 rounded-lg">
                        <MaterialIcons name="edit" size={20} color="#162E93" />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center mb-4">
                    <MaterialIcons name="people-outline" size={18} color="#6b7280" />
                    <Text className="text-gray-500 font-semibold ml-1">
                        Xem danh sách nộp 
                    </Text> 
                </View>
                
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center bg-green-50 px-2 py-1.5 rounded-lg border border-green-400">
                        <MaterialIcons name="attach-money" size={16} color="#10b981" />
                        <Text className="text-green-500 font-bold">{item.salary}</Text>
                    </View>
                    <View className="flex-row items-center flex-1 justify-end ml-2 ">
                        <MaterialIcons name="access-time" size={14} color="#9ca3af" />
                        <Text className="text-gray-700 text-sm ml-1" numberOfLines={1} ellipsizeMode="tail">Đang tuyển</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 ">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} className="pb-5 px-4 shadow-lg z-10">
                <View className="flex-row justify-between items-center mb-3 px-1 mt-2">
                    <View>
                        <Text className="text-white/80 text-sm">Xin chào, Nhà tuyển dụng</Text>
                        <Text className="text-white text-xl font-bold">{user?.first_name} {user?.last_name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('CreateJobPost')} className="bg-yellow-400 px-4 py-2 rounded-xl flex-row items-center shadow-md">
                        <MaterialIcons name="add" size={20} color="#162E93" />
                        <Text className="text-[#162E93] font-bold ml-1">Tạo tin</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row bg-white px-4 py-3 rounded-xl items-center shadow-inner">
                    <MaterialIcons name="search" size={28} color="#162E93" />
                    <TextInput 
                        placeholder="Tìm kiếm tin đã đăng..."
                        value={searchText}
                        onChangeText={setSearchText}
                        className="flex-1 text-gray-700 ml-2 font-medium"
                    />
                </View>
            </View>

            <View className="py-4">
                <FlatList 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['Tất cả', 'Đang tuyển', 'Hết hạn', 'Chờ duyệt']}
                    keyExtractor={(item) => item}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => setStatusFilter(item)}
                            className={`border border-blue-500 px-6 py-2.5 mr-3 rounded-xl flex-row items-center ${statusFilter === item ? 'bg-yellow-400 shadow-md border-yellow-400' : 'bg-blue-100'}`}
                        >
                            <Text className={`font-bold ${statusFilter === item ? 'text-gray-900' : 'text-[#162E93]'}`}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <View className="px-5 mb-2">
                <Text className="font-bold text-gray-700 text-lg">Danh sách tin đăng của bạn</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10"  />
            ) : (
                <FlatList 
                    data={filteredJobs}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()} 
                    renderItem={renderJobItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListEmptyComponent={<Text className="text-center text-gray-400 mt-20">Bạn chưa có tin tuyển dụng nào.</Text>}
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity className="items-center">
                    <MaterialIcons name="dashboard" size={28} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Bảng tin</Text>
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

export default EmployerHome;