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
    Modal,
    ScrollView,
    Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { HOST } from '../../configs/Apis';

const EmployerCandidates = ({ navigation }) => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasUnread, setHasUnread] = useState(false); // 🔴 State quản lý chấm đỏ

    const [isCoverLetterVisible, setCoverLetterVisible] = useState(false);
    const [currentCoverLetter, setCurrentCoverLetter] = useState('');

    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const fetchCandidates = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
            const currentHrId = userRes.data.id;

            const response = await axios.get(`${HOST}/api/applications/`, config);
            const allApps = response.data.results ? response.data.results : response.data;
            
            const myCandidates = allApps.filter(app => {
                const jobEmployerId = app.job?.employer?.id || app.job?.employer || app.job?.employer_id;
                return jobEmployerId === currentHrId;
            });

            setCandidates(myCandidates);
        } catch (error) {
            console.error("Lỗi tải danh sách ứng viên:", error);
        } finally {
            setLoading(false);
        }
    };

    // 🔴 HÀM KIỂM TRA CHẤM ĐỎ ĐÃ ĐƯỢC ĐỒNG BỘ HOÀN TOÀN VỚI MÀN HÌNH THÔNG BÁO
    const checkUnreadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userId = await AsyncStorage.getItem('current_user_id');
            if (!token || !userId) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // 1. Gọi song song 2 API y hệt như bên trang Notifications
            const [appRes, sysRes] = await Promise.all([
                axios.get(`${HOST}/api/applications/`, config),
                axios.get(`${HOST}/api/notifications/`, config)
            ]);
            
            // 2. Lọc danh sách Đơn ứng tuyển của HR này
            const appsData = appRes.data.results || appRes.data;
            const myCandidates = appsData.filter(app => {
                const jobEmployerId = app.job?.employer?.id || app.job?.employer || app.job?.employer_id;
                return String(jobEmployerId) === String(userId);
            });

            // 3. Lấy danh sách Thông báo hệ thống
            const sysData = sysRes.data.results || sysRes.data;

            // 4. Lấy danh sách ID đã đọc từ AsyncStorage
            const savedReadIds = await AsyncStorage.getItem(`read_notifications_employer_${userId}`);
            const readIds = savedReadIds ? JSON.parse(savedReadIds) : [];
            
            // 5. Kiểm tra xem có Đơn ứng tuyển (APP) nào chưa đọc không
            const unreadAppExists = myCandidates.some(item => {
                const currentKey = `APP_${item.id}_${item.updated_date || item.created_date}`;
                return !readIds.includes(currentKey);
            });

            // 6. Kiểm tra xem có Thông báo hệ thống (SYS) nào chưa đọc không
            const unreadSysExists = sysData.some(item => {
                const currentKey = `SYS_${item.id}_${item.updated_date || item.created_date}`;
                return !readIds.includes(currentKey);
            });

            // Nếu 1 trong 2 loại có thông báo mới -> Bật chấm đỏ
            setHasUnread(unreadAppExists || unreadSysExists);
            
        } catch (error) {
            console.error("Lỗi kiểm tra dấu chấm đỏ:", error.message);
            setHasUnread(false);
        }
    };


    useFocusEffect(
        useCallback(() => {
            fetchCandidates();
            checkUnreadNotifications(); // 🔴 Gọi hàm check khi focus
        }, [])
    );




    const updateStatus = async (applicationId, newStatus) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            await axios.patch(`${HOST}/api/applications/${applicationId}/change-status/`, {
                status: newStatus
            }, config);
            
            setCandidates(prev => prev.map(app => 
                app.id === applicationId ? { ...app, status: newStatus } : app
            ));
            
            Alert.alert("Thành công", newStatus === 2 ? "Đã chấp nhận ứng viên!" : "Đã từ chối ứng viên.");
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái lúc này.");
        }
    };

    const handleViewCoverLetter = (content) => {
        setCurrentCoverLetter(content);
        setCoverLetterVisible(true);
    };

    const handleOpenCV = async (cvUrl) => {
        if (!cvUrl) {
            Alert.alert("Thông báo", "Ứng viên này không có file CV đính kèm.");
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
            console.error(error);
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 0: return { color: '#f59e0b', bg: 'bg-yellow-100', text: 'Chờ xử lý' };
            case 1: return { color: '#3b82f6', bg: 'bg-blue-100', text: 'Đã xem' };
            case 2: return { color: '#10b981', bg: 'bg-green-100', text: 'Đã nhận' };
            case 3: return { color: '#ef4444', bg: 'bg-red-100', text: 'Từ chối' };
            default: return { color: '#6b7280', bg: 'bg-gray-100', text: 'Không rõ' };
        }
    };

    const renderCandidateItem = ({ item }) => {
        const jobTitle = item.job?.title || `Công việc #${item.job}`;
        const candidateName = item.candidate?.first_name 
            ? `${item.candidate.first_name} ${item.candidate.last_name || ''}` 
            : item.candidate?.username || `Ứng viên #${item.candidate}`;
            
        const applyDate = new Date(item.created_date).toLocaleDateString('vi-VN');
        const currentStatus = Number(item.status);
        const statusConfig = getStatusStyle(currentStatus);

        return (
            <View className="bg-white p-5 rounded-2xl mb-4 mx-4 shadow-sm border border-yellow-500">
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-gray-500 mb-1">Ứng tuyển vị trí:</Text>
                        <Text className="text-lg font-bold text-[#162E93]" numberOfLines={1}>{jobTitle}</Text>
                    </View>
                    <View className={`px-3 py-1.5 rounded-lg ${statusConfig.bg}`}>
                        <Text style={{ color: statusConfig.color }} className="font-bold text-xs">
                            {statusConfig.text}
                        </Text>
                    </View>
                </View>

                <View className="flex-row items-center bg-gray-50 p-3 rounded-xl mb-4">
                    <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <MaterialIcons name="person" size={24} color="#162E93" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-gray-800 text-base">{candidateName}</Text>
                        <View className="flex-row items-center mt-1">
                            <MaterialIcons name="access-time" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">Nộp ngày: {applyDate}</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity onPress={() => handleOpenCV(item.cv_file)} className="bg-blue-100 p-2 rounded-xl">
                        <FontAwesome5 name="file-pdf" size={20} color="#162E93" />
                    </TouchableOpacity>
                </View>

                {item.content ? (
                    <TouchableOpacity 
                        onPress={() => handleViewCoverLetter(item.content)}
                        className="bg-gray-100 py-2 px-4 rounded-lg mb-4 self-start border border-gray-200 shadow-sm"
                    >
                        <Text className="text-gray-700 font-medium text-sm">Xem thư giới thiệu</Text>
                    </TouchableOpacity>
                ) : null}

                {(currentStatus === 0 || currentStatus === 1) && (
                    <View className="flex-row justify-between border-t border-gray-100 pt-4">
                        <TouchableOpacity 
                            onPress={() => updateStatus(item.id, 3)} 
                            className="flex-1 bg-red-100 py-3 rounded-xl mr-2 items-center"
                        >
                            <Text className="text-red-600 font-bold">Từ chối</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => updateStatus(item.id, 2)} 
                            className="flex-1 bg-green-500 py-3 rounded-xl ml-2 items-center shadow-sm"
                        >
                            <Text className="text-white font-bold">Chấp nhận</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View 
                style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} 
                className="pb-4 px-4 shadow-lg z-10 flex-row items-center justify-center"
            >
                <Text className="text-white text-xl font-bold">Quản lý Ứng viên</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#162E93" className="mt-10" />
            ) : (
                <FlatList 
                    data={candidates}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCandidateItem}
                    showsVerticalScrollIndicator={false}
                    className="pt-5"
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <MaterialIcons name="people-outline" size={60} color="#ccc" />
                            <Text className="text-center text-gray-400 mt-4 text-base">Chưa có ứng viên nào ứng tuyển.</Text>
                        </View>
                    }
                />
            )}

            <View className="flex-row bg-white py-3 border-t border-gray-100 justify-around items-center absolute bottom-0 w-full pb-6 shadow-2xl">
                <TouchableOpacity onPress={() => navigation.navigate('EmployerHome')} className="items-center">
                    <MaterialIcons name="dashboard" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Bảng tin</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerJobManager')} className="items-center">
                    <MaterialIcons name="work-outline" size={26} color="#9ca3af" />
                    <Text className="text-[10px] font-bold mt-1 text-gray-400">Quản lý tin</Text>
                </TouchableOpacity>

                <TouchableOpacity className="items-center">
                    <MaterialIcons name="people-alt" size={28} color="#162E93" />
                    <Text className="text-[10px] font-bold mt-1 text-[#162E93]">Ứng viên</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('EmployerNotifications')} className="items-center">
                    <View className="relative">
                        <MaterialIcons name="notifications" size={26} color="#9ca3af" />
                        {/* 🔴 Logic chấm đỏ */}
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

            <Modal
                visible={isCoverLetterVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCoverLetterVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white w-full rounded-3xl p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
                            <Text className="text-xl font-bold text-gray-800">Thư giới thiệu</Text>
                            <TouchableOpacity onPress={() => setCoverLetterVisible(false)} className="p-1 bg-gray-100 rounded-full">
                                <MaterialIcons name="close" size={22} color="#4b5563" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
                            <Text className="text-gray-700 leading-6 text-base italic">
                                "{currentCoverLetter}"
                            </Text>
                        </ScrollView>

                        <TouchableOpacity 
                            onPress={() => setCoverLetterVisible(false)}
                            className="mt-6 bg-[#162E93] py-3.5 rounded-xl items-center shadow-sm"
                        >
                            <Text className="text-white font-bold text-base">Đóng thư</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default EmployerCandidates;