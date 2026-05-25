import React, { useState, useCallback, useMemo } from 'react';
import { 
    View, 
    Platform, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    StatusBar, 
    Alert, 
    useWindowDimensions, 
    ActivityIndicator, 
    TextInput,
    KeyboardAvoidingView,
    Image,
    Modal
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker'; 
import { useFocusEffect } from '@react-navigation/native';
import { HOST } from '../../configs/Apis'; 

const tagsStyles = { 
    body: { color: '#4b5563', fontSize: 16, lineHeight: 24 }, 
    p: { marginVertical: 4 },
    li: { marginVertical: 2 }
};

const formatDeadline = (deadlineString) => {
    if (!deadlineString) return "Chưa cập nhật";
    const d = new Date(deadlineString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const getCityFromAddress = (addressString) => {
    if (!addressString) return "Chưa cập nhật";
    const parts = addressString.split(',');
    return parts[parts.length - 1].trim();
};

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

const JobDetail = ({ route, navigation }) => {
    const { job, isLikedInitially, onLikeChange } = route.params; 
    const currentJobId = (job && typeof job === 'object') ? job.id : job;
    
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
    const { width } = useWindowDimensions();
    
    const [isLiked, setIsLiked] = useState(isLikedInitially || false);
    const [similarJobs, setSimilarJobs] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(true);
    
    // 🔴 Đã đổi lại thành tên biến chuẩn: likedJobs
    const [likedJobs, setLikedJobs] = useState([]);
    
    const [appStatus, setAppStatus] = useState(null); 
    const [isApplyModalVisible, setApplyModalVisible] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [cvFile, setCvFile] = useState(null);
    const [coverLetter, setCoverLetter] = useState('');
    
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const [isCompareModalVisible, setCompareModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let isActive = true; 
            const fetchAllData = async () => {
                try {
                    const token = await AsyncStorage.getItem('access_token');
                    if (!token) return;

                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    
                    const userId = await AsyncStorage.getItem('current_user_id');
                    
                    if (userId) {
                        const savedLikesStr = await AsyncStorage.getItem(`likedJobs_${userId}`);
                        if (savedLikesStr) {
                            setLikedJobs(JSON.parse(savedLikesStr));
                        } else {
                            setLikedJobs([]);
                        }
                    }
                    
                    const [userRes, jobsRes, appRes] = await Promise.all([
                        axios.get(`${HOST}/api/users/current-user/`, config),
                        axios.get(`${HOST}/api/jobs/`, config),
                        axios.get(`${HOST}/api/applications/?t=${new Date().getTime()}`, config)
                    ]);

                    if (isActive) {
                        setFullName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim() || userRes.data.username);
                        setPhone(userRes.data.phone_number || '');
                        setEmail(userRes.data.email || '');

                        const allJobs = jobsRes.data.results ? jobsRes.data.results : jobsRes.data;
                        setSimilarJobs(allJobs.filter(item => item.category === job?.category && item.id !== currentJobId));
                        setLoadingSimilar(false);

                        const appliedList = appRes.data.results ? appRes.data.results : appRes.data;
                        const jobApps = appliedList.filter(app => String(app.job?.id || app.job) === String(currentJobId));
                        
                        if (jobApps.length > 0) {
                            jobApps.sort((a, b) => Number(b.id) - Number(a.id));
                            setAppStatus(String(jobApps[0].status) === '3' ? 'REJECTED' : 'ACTIVE');
                        } else {
                            setAppStatus(null);
                        }
                    }
                } catch (error) {
                    console.log("Lỗi tải dữ liệu:", error.message);
                }
            };
            fetchAllData();
            return () => { isActive = false; };
        }, [currentJobId, job?.category])
    );

    const htmlSource = useMemo(() => ({ html: job?.description || "<p>Chưa có mô tả chi tiết.</p>" }), [job?.description]);

    const comparisonList = useMemo(() => {
        if (!job) return [];
        const allCompareJobs = [job, ...similarJobs];
        
        return allCompareJobs.map(j => ({
            id: j.id,
            title: j.title,
            company: j.employer_name || j.employer?.company_name || "Công ty",
            salaryStr: j.salary || "Thỏa thuận",
            salaryVal: parseSalaryToMillions(j.salary)
        })).sort((a, b) => b.salaryVal - a.salaryVal); 
    }, [job, similarJobs]);

    const toggleLike = async (jobId = currentJobId) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userId = await AsyncStorage.getItem('current_user_id');
            if (!token || !userId) return Alert.alert("Yêu cầu", "Vui lòng đăng nhập!");

            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post(`${HOST}/api/jobs/${jobId}/like/`, {}, config);
            const newLikedState = response.data.liked;
            
            let newLikes = [...likedJobs];
            if (newLikedState) {
                newLikes.push(jobId);
            } else {
                newLikes = newLikes.filter(id => id !== jobId);
            }
            
            setLikedJobs(newLikes);
            await AsyncStorage.setItem(`likedJobs_${userId}`, JSON.stringify(newLikes));

            if (String(jobId) === String(currentJobId)) {
                setIsLiked(newLikedState); 
                if (onLikeChange) onLikeChange(currentJobId, newLikedState);
            } 
        } catch (error) { 
            Alert.alert("Lỗi", "Không thể lưu công việc!"); 
        }
    };

const syncLikeState = useCallback((id, newLikedState) => {
    setLikedJobs(prev => {
        if (newLikedState) {
            return prev.includes(id) ? prev : [...prev, id];
        } else {
            return prev.filter(likedId => likedId !== id);
        }
    });
}, []);

    const handlePickCV = async () => {
        const result = await DocumentPicker.getDocumentAsync({});
        if (!result.canceled) setCvFile(result.assets[0]);
    };

    const submitApplication = async () => {
        if (!cvFile || !phone) return Alert.alert("Thiếu thông tin", "Vui lòng chọn CV và nhập số điện thoại.");
        setIsApplying(true);
        try {
            const formData = new FormData();
            formData.append('cv_file', { uri: cvFile.uri, name: cvFile.name, type: cvFile.mimeType || 'application/pdf' });
            if (coverLetter.trim() !== '') formData.append('content', coverLetter);

            const token = await AsyncStorage.getItem('access_token');
            
            const response = await fetch(`${HOST}/api/jobs/${currentJobId}/apply/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (response.ok) {
                setApplyModalVisible(false);
                setAppStatus('ACTIVE');
                Alert.alert("Thành công", "Đã gửi đơn ứng tuyển!");
            }
        } catch (error) { Alert.alert("Lỗi", "Không thể gửi đơn."); }
        finally { setIsApplying(false); }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} className="pb-6 px-4 rounded-b-[5px] shadow-lg flex-row items-center">
                <TouchableOpacity 
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} 
                    className="p-2 bg-white/20 rounded-full mr-4"
                >
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Chi tiết công việc</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
                <View className="bg-white p-6 shadow-sm border border-blue-500 mb-6 rounded-2xl">
                    <Text className="text-2xl font-bold text-gray-800 mb-3">{job?.title || "Công việc"}</Text>
                    
                    <View className="flex-row items-center justify-between bg-gray-50 p-3 mb-3 rounded-xl border border-gray-100">
                        <View className="flex-row items-center flex-1">
                            <View className="bg-green-100 p-2 rounded-xl mr-3"><MaterialIcons name="attach-money" size={24} color="#009107" /></View>
                            <View className="flex-1 mr-2">
                                <Text className="text-gray-700 text-xs font-medium">Mức lương</Text>
                                <Text className="text-green-500 font-bold text-lg" numberOfLines={1}>{job?.salary || "Thỏa thuận"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setCompareModalVisible(true)}
                            className="bg-yellow-100 border border-yellow-300 px-3 py-2 rounded-lg shadow-sm flex-row items-center"
                        >
                            <MaterialIcons name="insights" size={16} color="#d97706" />
                            <Text className="text-[#d97706] font-bold text-xs ml-1">So sánh</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View className="flex-row items-center bg-gray-50 p-3 mb-3 rounded-xl border border-gray-100">
                        <View className="bg-blue-100 p-2 rounded-xl mr-3"><MaterialIcons name="location-on" size={24} color="#3b82f6" /></View>
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs font-medium">Địa điểm</Text>
                            <Text className="text-gray-800 font-bold">{getCityFromAddress(job?.location)}</Text>
                        </View>
                    </View>
                    
                    <View className="flex-row items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <View className="bg-red-100 p-2 rounded-xl mr-3"><MaterialIcons name="access-alarm" size={24} color="#ef4444" /></View>
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs font-medium">Hạn nộp hồ sơ</Text>
                            <Text className="text-gray-800 font-bold">{formatDeadline(job?.deadline)}</Text>
                        </View>
                    </View>
                </View>

                <View className="bg-white p-6 shadow-sm border border-blue-500 rounded-2xl mb-8">
                    <Text className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Thông tin chi tiết</Text>
                    <RenderHTML 
                        contentWidth={width - 48} 
                        source={htmlSource} 
                        tagsStyles={tagsStyles} 
                        baseStyle={{ flexWrap: 'wrap' }}
                    />
                </View>

                <Text className="text-lg font-bold text-gray-800 mb-4 ml-1">Các công việc liên quan</Text>
                
                {loadingSimilar ? (
                    <ActivityIndicator size="small" color="#162E93" className="my-4" />
                ) : similarJobs.length === 0 ? (
                    <Text className="text-gray-400 text-center my-4 italic">Không có công việc liên quan nào cùng danh mục.</Text>
                ) : (
                    similarJobs.map((item) => {
                        const isItemLiked = likedJobs.includes(item.id);
                        
                        const companyName = item.company_name || item.employer?.company_name || "Công ty tuyển dụng";
                        const shortLocation = getCityFromAddress(item.location);
                        
                        const avatarUrl = item.company_avatar || item.employer?.avatar
                            ? (String(item.company_avatar || item.employer?.avatar).startsWith('http') 
                                ? (item.company_avatar || item.employer?.avatar) 
                                : `${HOST}${item.company_avatar || item.employer?.avatar}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=162E93&color=fff`;

                        return (
                            <TouchableOpacity 
                                key={item.id}
                                onPress={() => navigation.push('JobDetail', { 
                                    job: item,
                                    isLikedInitially: isItemLiked,
                                    onLikeChange: syncLikeState
                                })}
                                className="bg-white p-5 rounded-xl mb-4 shadow-sm border border-blue-200"
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
                                            <TouchableOpacity 
                                                onPress={(e) => { e.stopPropagation(); toggleLike(item.id); }} 
                                                className="p-1 -mt-1 -mr-2"
                                            >
                                                <MaterialIcons name={isItemLiked ? "favorite" : "favorite-border"} size={26} color={isItemLiked ? "#ef4444" : "#162E93"} />
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
                                        <Text className="text-gray-700 text-sm ml-1" numberOfLines={1} ellipsizeMode="tail">{shortLocation}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <View className="absolute bottom-0 w-full bg-white px-5 py-3 border-t border-gray-100 shadow-2xl flex-row justify-between items-center pb-4">
                 <TouchableOpacity onPress={() => toggleLike(currentJobId)} className="p-2 bg-white rounded-3xl mr-4 border border-blue-700">
                    <MaterialIcons name={isLiked ? "favorite" : "favorite-border"} size={28} color={isLiked ? "#ef4444" : "#002b75"} />
                </TouchableOpacity>

                {appStatus === 'ACTIVE' ? (
                    <View className="flex-1 bg-gray-400 py-3 rounded-3xl items-center justify-center">
                        <Text className="text-white font-bold text-lg">Đã ứng tuyển</Text>
                    </View>
                ) : appStatus === 'REJECTED' ? (
                    <TouchableOpacity onPress={() => setApplyModalVisible(true)} className="flex-1 bg-orange-500 py-3 rounded-3xl shadow-sm items-center justify-center">
                        <Text className="text-white font-bold text-lg">Ứng tuyển lại</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => setApplyModalVisible(true)} className="flex-1 bg-yellow-400 py-3 rounded-3xl shadow-sm items-center justify-center">
                        <Text className="text-gray-800 font-bold text-lg">Ứng tuyển ngay</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isApplyModalVisible && (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999 }}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} enabled={Platform.OS === 'ios'}>
                        <View className="flex-1 bg-black/50 justify-end">
                            <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
                                <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
                                    <View>
                                        <Text className="text-xl font-bold text-gray-800">Đơn ứng tuyển</Text>
                                        <Text className="text-sm text-[#162E93] font-semibold mt-1">{job?.title || "Công việc"}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setApplyModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                        <MaterialIcons name="close" size={24} color="#4b5563" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text className="font-bold text-gray-700 mb-2">Hồ sơ đính kèm (CV) <Text className="text-red-500">*</Text></Text>
                                    <TouchableOpacity onPress={handlePickCV} className={`border-2 border-dashed ${cvFile ? 'border-green-500 bg-green-50' : 'border-blue-300 bg-blue-50'} rounded-xl p-4 items-center justify-center mb-4 flex-row`}>
                                        {cvFile ? (
                                            <>
                                                <FontAwesome5 name="file-pdf" size={24} color="#10b981" />
                                                <View className="ml-3 flex-1">
                                                    <Text className="text-green-700 font-bold" numberOfLines={1}>{cvFile.name}</Text>
                                                    <Text className="text-green-600 text-xs mt-1">Đã chọn thành công</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <MaterialIcons name="cloud-upload" size={28} color="#3b82f6" />
                                                <Text className="text-blue-600 font-semibold ml-2">Nhấn để tải lên CV (PDF, DOC)</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <Text className="font-bold text-gray-700 mb-2 mt-2">Họ và tên</Text>
                                    <TextInput value={fullName} onChangeText={setFullName} className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4 border border-gray-200" placeholder="VD: Nguyễn Văn A" />

                                    <Text className="font-bold text-gray-700 mb-2">Email liên hệ</Text>
                                    <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4 border border-gray-200" placeholder="VD: email@gmail.com" />

                                    <Text className="font-bold text-gray-700 mb-2">Số điện thoại <Text className="text-red-500">*</Text></Text>
                                    <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4 border border-gray-200" placeholder="VD: 0912345678" />

                                    <Text className="font-bold text-gray-700 mb-2">Thư giới thiệu (Cover Letter)</Text>
                                    <TextInput value={coverLetter} onChangeText={setCoverLetter} multiline numberOfLines={4} textAlignVertical="top" className="bg-gray-100 p-4 rounded-xl text-gray-800 mb-6 border border-gray-200" placeholder="Viết vài lời giới thiệu bản thân hoặc lý do bạn phù hợp với công việc này..." />
                                </ScrollView>

                                <TouchableOpacity onPress={submitApplication} disabled={isApplying} className={`w-full py-4 rounded-2xl items-center justify-center mt-2 ${isApplying ? 'bg-gray-400' : 'bg-[#162E93]'}`}>
                                    {isApplying ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white text-lg">Gửi đơn ứng tuyển</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            )}

            <Modal
                visible={isCompareModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCompareModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
                        <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <View>
                                <Text className="text-xl font-bold text-gray-800">Xếp hạng mức lương</Text>
                                <Text className="text-xs text-gray-500 mt-1">Các công việc cùng ngành nghề</Text>
                            </View>
                            <TouchableOpacity onPress={() => setCompareModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <MaterialIcons name="close" size={24} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {comparisonList.map((item, index) => {
                                const isCurrentJob = String(item.id) === String(currentJobId);
                                
                                return (
                                    <View 
                                        key={index} 
                                        className={`p-4 rounded-xl mb-3 flex-row items-center justify-between ${
                                            isCurrentJob 
                                            ? 'bg-yellow-50 border-2 border-yellow-400 shadow-sm' 
                                            : 'bg-white border border-gray-200'
                                        }`}
                                    >
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <View className="flex-1">
                                                <Text className="font-bold text-gray-800 text-sm" numberOfLines={1}>{item.title}</Text>
                                                <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{item.company}</Text>
                                            </View>
                                        </View>
                                        
                                        <View className="bg-green-50 px-2 py-1.5 rounded-lg border border-green-200 ml-1">
                                            <Text className="text-green-600 font-bold text-xs">{item.salaryStr}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                            
                            {comparisonList.length === 1 && (
                                <Text className="text-center text-gray-400 italic mt-5">Chưa có đủ dữ liệu để so sánh trong ngành này.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

export default JobDetail;