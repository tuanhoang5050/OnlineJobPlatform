import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StatusBar, 
    Image, 
    Alert, 
    Modal, 
    ScrollView,
    Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native'; 
import { HOST } from '../../configs/Apis';

const parseSalaryToMillions = (salaryStr) => {
    if (!salaryStr) return 0;
    const str = salaryStr.toLowerCase().trim();
    
    if (str.includes('thỏa thuận') || str.includes('thoa thuan')) return -1; 
    
    if (str.includes('$')) {
        const numbers = str.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            const usd = parseInt(numbers[numbers.length - 1], 10); 
            return (usd * 25000) / 1000000; 
        }
    }
    
    const numbers = str.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        const vals = numbers.map(n => parseInt(n, 10));
        return Math.max(...vals); 
    }
    return 0;
};

const Home = ({ navigation }) => {
    const [user, setUser] = useState(null); 
    const [categories, setCategories] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [activeCategoryId, setActiveCategoryId] = useState(null); 
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [likedJobs, setLikedJobs] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);

    const [isFilterVisible, setFilterVisible] = useState(false);
    const [filterLocation, setFilterLocation] = useState('Tất cả');
    const [filterSalary, setFilterSalary] = useState('Tất cả');
    const [sortBy, setSortBy] = useState('newest'); 

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    useFocusEffect(
        React.useCallback(() => {
            const loadSavedLikes = async () => {
                try {
                    const userId = await AsyncStorage.getItem('current_user_id');
                    if (userId) {
                        const savedLikesStr = await AsyncStorage.getItem(`likedJobs_${userId}`);
                        if (savedLikesStr) {
                            setLikedJobs(JSON.parse(savedLikesStr));
                        } else {
                            setLikedJobs([]); 
                        }
                    }
                } catch (e) {
                    console.error("Lỗi đọc Storage:", e);
                }
            };
            
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

            loadSavedLikes();
            checkUnreadNotifications(); 
        }, [])
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                navigation.navigate('Login');
                return;
            }

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [catsRes, jobsRes] = await Promise.all([
                axios.get(`${HOST}/api/categories/`, config),
                axios.get(`${HOST}/api/jobs/`, config) 
            ]);

            setCategories(catsRes.data.results ? catsRes.data.results : catsRes.data);
            setJobs(jobsRes.data.results ? jobsRes.data.results : jobsRes.data);

            try {
                const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
                const userData = userRes.data;
                setUser(userData);
                
                await AsyncStorage.setItem('current_user_id', String(userData.id));
                
                const savedLikesStr = await AsyncStorage.getItem(`likedJobs_${userData.id}`);
                if (savedLikesStr) setLikedJobs(JSON.parse(savedLikesStr));
                else setLikedJobs([]);

            } catch (userErr) {
                console.log("Lỗi tải thông tin user:", userErr.message);
            }

        } catch (error) {
            console.error("Lỗi API Home:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 1. Lọc dữ liệu thô theo các tiêu chí tìm kiếm/bộ lọc trước
    const allFilteredJobs = jobs
        .filter(job => {
            const matchCategory = !activeCategoryId || job.category === activeCategoryId;
            const matchSearch = job.title.toLowerCase().includes(searchText.toLowerCase()) ||
                                (job.employer_name && job.employer_name.toLowerCase().includes(searchText.toLowerCase()));
            const matchLocation = filterLocation === 'Tất cả' || 
                                  (job.location && job.location.toLowerCase().includes(filterLocation.toLowerCase()));
            
            let matchSalary = true;
            if (filterSalary !== 'Tất cả') {
                const salValue = parseSalaryToMillions(job.salary);
                if (filterSalary === 'Dưới 10 triệu') {
                    matchSalary = salValue > 0 && salValue < 10;
                } else if (filterSalary === '10 - 20 triệu') {
                    matchSalary = salValue >= 10 && salValue <= 20;
                } else if (filterSalary === 'Trên 20 triệu') {
                    matchSalary = salValue > 20;
                }
            }
            
            return matchCategory && matchSearch && matchLocation && matchSalary;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return b.id - a.id; 
            } else if (sortBy === 'salary') {
                return parseSalaryToMillions(b.salary) - parseSalaryToMillions(a.salary); 
            }
            return 0;
        });

    // 2. CHIA ĐÔI DỮ LIỆU THÀNH 2 MẢNG RIÊNG BIỆT (VIP VÀ THƯỜNG)
    const featuredJobs = allFilteredJobs.filter(job => job.is_featured);
    const regularJobs = allFilteredJobs.filter(job => !job.is_featured);

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

        } catch (error) {
            console.error("Lỗi thả tim:", error.message);
            Alert.alert("Lỗi", "Không thể thả tim lúc này, vui lòng thử lại sau!");
        }
    };

    const syncLikeState = async (jobId, isNowLiked) => {
        let newLikes;
        if (isNowLiked) {
            newLikes = [...likedJobs, jobId];
        } else {
            newLikes = likedJobs.filter(id => id !== jobId);
        }
        setLikedJobs(newLikes);
        
        const userId = await AsyncStorage.getItem('current_user_id');
        await AsyncStorage.setItem(`likedJobs_${userId}`, JSON.stringify(newLikes)); 
    };

    // Render item dành riêng cho việc làm cuộn ngang VIP ở phía trên
    const renderFeaturedJobItem = ({ item }) => {
        const shortLocation = item.location ? item.location.split(',').pop().trim() : "Chưa cập nhật";
        const isLiked = likedJobs.includes(item.id);
        const companyName = item.employer_name || "Nhà tuyển dụng";
        const avatarUrl = item.employer_avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('JobDetail', { 
                    job: item,
                    isLikedInitially: isLiked,
                    onLikeChange: syncLikeState
                })}
                className="p-4 rounded-xl mr-4 bg-amber-50 border border-amber-300 w-72 shadow-sm"
            >
                <View className="flex-row items-center mb-3">
                    <View className="w-12 h-12 rounded-xl border border-amber-100 overflow-hidden mr-3 bg-white justify-center items-center">
                        <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center bg-red-500 self-start px-1.5 py-0.5 rounded mb-1">
                            <MaterialIcons name="flash-on" size={10} color="white" />
                            <Text className="text-white text-[9px] font-bold ml-0.5">TOP HOT</Text>
                        </View>
                        <Text className="text-sm font-semibold text-gray-500 flex-1" numberOfLines={1}>
                            {companyName}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleLike(item.id); }} className="p-1">
                        <MaterialIcons name={isLiked ? "favorite" : "favorite-border"} size={22} color={isLiked ? "#ef4444" : "#162E93"} />
                    </TouchableOpacity>
                </View>

                <Text className="text-base font-bold text-amber-900 mb-3 h-12" numberOfLines={2}>
                    {item.title}
                </Text>

                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center bg-emerald-600 px-2 py-1 rounded">
                        <Text className="text-white font-bold text-xs">{item.salary}</Text>
                    </View>
                    <View className="flex-row items-center flex-1 justify-end ml-2">
                        <MaterialIcons name="location-on" size={12} color="#78350f" />
                        <Text className="text-amber-900 text-xs ml-0.5" numberOfLines={1}>{shortLocation}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Render item dành cho danh sách việc làm Bình thường ở phía dưới
    const renderJobItem = ({ item }) => {
        const shortLocation = item.location ? item.location.split(',').pop().trim() : "Chưa cập nhật";
        const isLiked = likedJobs.includes(item.id);
        const companyName = item.employer_name || "Nhà tuyển dụng";
        const avatarUrl = item.employer_avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('JobDetail', { 
                    job: item,
                    isLikedInitially: isLiked,
                    onLikeChange: syncLikeState
                })}
                className="p-5 rounded-xl mb-4 mx-4 shadow-sm border bg-white border-blue-100"
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
                                <MaterialIcons name={isLiked ? "favorite" : "favorite-border"} size={26} color={isLiked ? "#ef4444" : "#162E93"} />
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
                    <View className="flex-row items-center flex-1 justify-end ml-2">
                        <MaterialIcons name="location-on" size={14} color="#9ca3af" />
                        <Text className="text-gray-700 text-sm ml-1" numberOfLines={1}>{shortLocation}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Gom toàn bộ Categories và Việc làm VIP vào Header Component
    const renderListHeader = () => (
        <View>
            {/* Thanh danh mục ngành nghề */}
            <View className="py-4">
                <FlatList 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{id: null, name: 'Tất cả'}, ...categories]}
                    keyExtractor={(item) => item.id?.toString() || 'all'}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => setActiveCategoryId(item.id)}
                            className={`border px-6 py-2.5 mr-3 rounded-xl flex-row items-center ${activeCategoryId === item.id ? 'bg-yellow-400 shadow-md border-yellow-400' : 'bg-blue-100 border-blue-200'}`}
                        >
                            <Text className={`font-bold ${activeCategoryId === item.id ? 'text-gray-900' : 'text-[#162E93]'}`}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* PHẦN 1: VIỆC LÀM TỐT NHẤT (Chỉ hiện khi có tin VIP) */}
            {featuredJobs.length > 0 && (
                <View className="mb-6">
                    <View className="flex-row items-center justify-between px-4 mb-3">
                        <View className="flex-row items-center">
                            <MaterialIcons name="stars" size={22} color="#eab308" />
                            <Text className="text-xl font-bold text-gray-900 ml-1.5">Việc làm tốt nhất</Text>
                        </View>
                        <Text className="text-xs text-amber-700 font-bold bg-amber-100 px-2.5 py-1 rounded-full">Đối tác ưu tiên</Text>
                    </View>
                    <FlatList
                        horizontal
                        data={featuredJobs}
                        keyExtractor={(item) => `featured-${item.id}`}
                        renderItem={renderFeaturedJobItem}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
                    />
                </View>
            )}

            {/* PHẦN 2: TIÊU ĐỀ CHO PHẦN DƯỚI (Đặt tên là: Việc làm mới nhất) */}
            <View className="flex-row items-center px-4 mb-4 mt-2">
                <MaterialIcons name="grid-view" size={20} color="#162E93" />
                <Text className="text-xl font-bold text-gray-900 ml-1.5">
                    {sortBy === 'newest' ? 'Việc làm mới nhất' : 'Việc làm lương cao'}
                </Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 ">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            {/* Sticky Search Header */}
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} 
                className="pb-5 px-4 shadow-lg z-10"
            >
                <View className="flex-row bg-white px-4 py-3 rounded-xl items-center shadow-inner">
                    <MaterialIcons name="search" size={28} color="#162E93" />
                    <TextInput 
                        placeholder="Tìm việc làm, công ty..."
                        value={searchText}
                        onChangeText={setSearchText}
                        className="flex-1 text-gray-700 ml-2 font-medium"
                    />
                    <TouchableOpacity onPress={() => setFilterVisible(true)} className="border-l border-gray-200 pl-3 ml-2">
                        <MaterialIcons name="tune" size={26} color="#162E93" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10"  />
            ) : (
                /* FlatList chính của cả màn hình (Hiển thị các công việc bình thường) */
                <FlatList 
                    data={regularJobs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderJobItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={
                        <Text className="text-center text-gray-400 mt-10 px-4">
                            Không tìm thấy công việc phổ thông nào phù hợp.
                        </Text>
                    }
                />
            )}

            {/* Bộ lọc Modal */}
            <Modal animationType="slide" transparent={true} visible={isFilterVisible} onRequestClose={() => setFilterVisible(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setFilterVisible(false)} />
                <View className="bg-white rounded-t-3xl p-6 absolute bottom-0 w-full shadow-2xl" style={{ maxHeight: '85%' }}>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-[#162E93]">Bộ lọc tìm kiếm</Text>
                        <TouchableOpacity onPress={() => setFilterVisible(false)} className="bg-gray-100 p-2 rounded-full">
                            <MaterialIcons name="close" size={24} color="#4b5563" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>                     
                        <Text className="font-bold text-gray-700 mb-3 text-base">Ngành nghề</Text>
                        <View className="flex-row flex-wrap mb-5">
                            {[{id: null, name: 'Tất cả'}, ...categories].map((cat) => (
                                <TouchableOpacity 
                                    key={cat.id || 'all-modal'} 
                                    onPress={() => setActiveCategoryId(cat.id)} 
                                    className={`px-4 py-2 rounded-full border mr-2 mb-2 ${activeCategoryId === cat.id ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={`font-semibold ${activeCategoryId === cat.id ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-bold text-gray-700 mb-3 text-base">Sắp xếp theo</Text>
                        <View className="flex-row flex-wrap mb-5">
                            {['newest', 'salary'].map((type) => (
                                <TouchableOpacity key={type} onPress={() => setSortBy(type)} className={`px-4 py-2 rounded-full border mr-2 mb-2 ${sortBy === type ? 'bg-[#162E93] border-[#162E93]' : 'bg-white border-gray-300'}`}>
                                    <Text className={`font-semibold ${sortBy === type ? 'text-white' : 'text-gray-600'}`}>{type === 'newest' ? 'Mới nhất' : 'Lương cao nhất'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-bold text-gray-700 mb-3 text-base">Địa điểm</Text>
                        <View className="flex-row flex-wrap mb-5">
                            {['Tất cả', 'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng'].map((loc) => (
                                <TouchableOpacity key={loc} onPress={() => setFilterLocation(loc)} className={`px-4 py-2 rounded-full border mr-2 mb-2 ${filterLocation === loc ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-gray-300'}`}>
                                    <Text className={`font-semibold ${filterLocation === loc ? 'text-gray-900' : 'text-gray-600'}`}>{loc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-bold text-gray-700 mb-3 text-base">Mức lương</Text>
                        <View className="flex-row flex-wrap mb-8">
                            {['Tất cả', 'Dưới 10 triệu', '10 - 20 triệu', 'Trên 20 triệu'].map((sal) => (
                                <TouchableOpacity key={sal} onPress={() => setFilterSalary(sal)} className={`px-4 py-2 rounded-full border mr-2 mb-2 ${filterSalary === sal ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-gray-300'}`}>
                                    <Text className={`font-semibold ${filterSalary === sal ? 'text-gray-900' : 'text-gray-600'}`}>{sal}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View className="flex-row justify-between pt-2">
                        <TouchableOpacity onPress={() => { setFilterLocation('Tất cả'); setFilterSalary('Tất cả'); setSortBy('newest'); setActiveCategoryId(null); }} className="w-[30%] py-3 rounded-2xl border border-gray-300 items-center justify-center">
                            <Text className="font-bold text-gray-600">Xóa lọc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setFilterVisible(false); }} className="w-[65%] py-3 rounded-2xl bg-[#162E93] items-center justify-center shadow-lg">
                            <Text className="font-bold text-white text-lg">Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Bottom Tab Bar */}
            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity className="items-center">
                    <MaterialIcons name="home" size={28} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Trang chủ</Text>
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
                
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="items-center">
                    <MaterialIcons name="account-circle" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Home;