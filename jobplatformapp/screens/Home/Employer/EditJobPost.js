import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, 
    ActivityIndicator, Alert, Platform, Modal, FlatList, KeyboardAvoidingView 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { HOST } from '../../../configs/Apis';

const decodeHTML = (html) => {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '');
    const entities = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
        '&agrave;': 'à', '&aacute;': 'á', '&acirc;': 'â', '&atilde;': 'ã', 
        '&egrave;': 'è', '&eacute;': 'é', '&ecirc;': 'ê', 
        '&igrave;': 'ì', '&iacute;': 'í', 
        '&ograve;': 'ò', '&oacute;': 'ó', '&ocirc;': 'ô', '&otilde;': 'õ', 
        '&ugrave;': 'ù', '&uacute;': 'ú', 
        '&yacute;': 'ý', '&đ': 'đ',
        '&Agrave;': 'À', '&Aacute;': 'Á', '&Acirc;': 'Â', '&Atilde;': 'Ã', 
        '&Egrave;': 'È', '&Eacute;': 'É', '&Ecirc;': 'Ê', 
        '&Igrave;': 'Ì', '&Iacute;': 'Í', 
        '&Ograve;': 'Ò', '&Oacute;': 'Ó', '&Ocirc;': 'Ô', '&Otilde;': 'Õ', 
        '&Ugrave;': 'Ù', '&Uacute;': 'Ú', 
        '&Yacute;': 'Ý', '&Đ': 'Đ',
        '&ndash;': '-', '&mdash;': '-', '&ldquo;': '"', '&rdquo;': '"', '&lsquo;': "'", '&rsquo;': "'"
    };
    return text.replace(/&[a-zA-Z0-9#]+;/g, match => entities[match] || match).trim();
};

const EditJobPost = ({ route, navigation }) => {
    const { job } = route.params;
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const [activeTab, setActiveTab] = useState('EDIT');

    const [title, setTitle] = useState(job?.title || '');
    const [salary, setSalary] = useState(job?.salary || '');
    const [location, setLocation] = useState(job?.location || '');
    const [description, setDescription] = useState(decodeHTML(job?.description));
    
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(job?.category || null);
    const [selectedCategoryName, setSelectedCategoryName] = useState('Chọn ngành nghề...');
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const initialDate = job?.deadline ? new Date(job.deadline) : new Date();
    const [deadlineDate, setDeadlineDate] = useState(initialDate);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [deadlineText, setDeadlineText] = useState(job?.deadline ? job.deadline.split('-').reverse().join('/') : '');

    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = await AsyncStorage.getItem('access_token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const catRes = await axios.get(`${HOST}/api/categories/`, config);
                const allCats = catRes.data.results || catRes.data;
                setCategories(allCats);
                
                if (job?.category) {
                    const currentCat = allCats.find(c => c.id === job.category);
                    if (currentCat) setSelectedCategoryName(currentCat.name);
                }

                setLoadingCandidates(true);

                const appRes = await axios.get(`${HOST}/api/applications/`, config);
                const allApps = appRes.data.results || appRes.data;
                const jobApps = allApps.filter(app => String(app.job?.id || app.job) === String(job.id));
                setCandidates(jobApps);
                
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            } finally {
                setLoadingCandidates(false);
            }
        };
        fetchInitialData();
    }, [job.id]);

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || deadlineDate;
        setShowDatePicker(Platform.OS === 'ios'); 
        setDeadlineDate(currentDate);

        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        setDeadlineText(`${day}/${month}/${year}`);
    };

    const handleUpdateJob = async () => {
        if (!title || !location || !description || !selectedCategory || !deadlineText) {
            Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các trường bắt buộc.");
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const finalDescription = `<p>${description.replace(/\n/g, '<br/>')}</p>`;
            const dbDeadline = `${deadlineDate.getFullYear()}-${(deadlineDate.getMonth() + 1).toString().padStart(2, '0')}-${deadlineDate.getDate().toString().padStart(2, '0')}`;

            const payload = {
                title: title,
                description: finalDescription,
                salary: salary || "Thỏa thuận",
                location: location,
                category: selectedCategory, 
                deadline: dbDeadline 
            };

            const response = await axios.patch(`${HOST}/api/jobs/${job.id}/`, payload, config);

            if (response.status === 200) {
                Alert.alert("Thành công", "Đã cập nhật tin tuyển dụng!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error("Lỗi sửa tin:", error);
            Alert.alert("Thất bại", "Không thể cập nhật tin lúc này.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const response = await axios.delete(`${HOST}/api/jobs/${job.id}/`, config);

            if (response.status === 204 || response.status === 200) {
                Alert.alert("Thành công", "Tin tuyển dụng đã bị xóa khỏi hệ thống.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error("Lỗi xóa tin:", error);
            Alert.alert("Thất bại", "Không thể xóa tin tuyển dụng này lúc này. Vui lòng kiểm tra lại backend.");
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteJob = () => {
        Alert.alert(
            "Cảnh báo xóa",
            "Bạn có chắc chắn muốn xóa tin tuyển dụng này không? Lưu ý: Mọi hồ sơ ứng viên đã nộp vào tin này có thể bị xóa theo.",
            [
                { text: "Hủy bỏ", style: "cancel" },
                { text: "Đồng ý xóa", onPress: handleDeleteJob, style: "destructive" }
            ]
        );
    };

    const updateCandidateStatus = async (applicationId, newStatus) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`${HOST}/api/applications/${applicationId}/change-status/`, { status: newStatus }, config);
            
            setCandidates(prev => prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app));
            Alert.alert("Thành công", newStatus === 2 ? "Đã chấp nhận ứng viên!" : "Đã từ chối ứng viên.");
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật trạng thái.");
        }
    };

    const getStatusStyle = (status) => {
        switch(Number(status)) {
            case 0: return { color: '#f59e0b', bg: 'bg-yellow-100', text: 'Chờ xử lý' };
            case 1: return { color: '#3b82f6', bg: 'bg-blue-100', text: 'Đã xem' };
            case 2: return { color: '#10b981', bg: 'bg-green-100', text: 'Đã nhận' };
            case 3: return { color: '#ef4444', bg: 'bg-red-100', text: 'Từ chối' };
            default: return { color: '#6b7280', bg: 'bg-gray-100', text: 'Không rõ' };
        }
    };

    const renderCandidate = ({ item }) => {
        const candidateName = item.candidate?.first_name ? `${item.candidate.first_name} ${item.candidate.last_name || ''}` : item.candidate?.username || `Ứng viên #${item.candidate}`;
        const applyDate = new Date(item.created_date).toLocaleDateString('vi-VN');
        const statusConfig = getStatusStyle(item.status);

        return (
            <View className="bg-white p-5 rounded-2xl mb-4 border border-yellow-500 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                            <MaterialIcons name="person" size={20} color="#162E93" />
                        </View>
                        <View>
                            <Text className="font-bold text-gray-800 text-base">{candidateName}</Text>
                            <Text className="text-gray-500 text-xs mt-0.5">Nộp ngày: {applyDate}</Text>
                        </View>
                    </View>
                    <View className={`px-2 py-1 rounded-lg ${statusConfig.bg}`}>
                        <Text style={{ color: statusConfig.color }} className="font-bold text-[10px]">{statusConfig.text}</Text>
                    </View>
                </View>

                {item.content ? (
                    <View className="bg-blue-50 p-3 rounded-xl mb-4">
                        <Text className="text-gray-600 text-sm italic" numberOfLines={2}>"{item.content}"</Text>
                    </View>
                ) : null}

                {(Number(item.status) === 0 || Number(item.status) === 1) && (
                    <View className="flex-row justify-between border-t border-gray-100 pt-3 mt-1">
                        <TouchableOpacity onPress={() => updateCandidateStatus(item.id, 3)} className="flex-1 bg-red-50 py-2 rounded-xl mr-2 items-center">
                            <Text className="text-red-500 font-bold">Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => updateCandidateStatus(item.id, 2)} className="flex-1 bg-green-500 py-2 rounded-xl ml-2 items-center">
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
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} className="px-4 shadow-lg z-10">
                
                {/* 🔴 HEADER MỚI CÓ HIỂN THỊ LƯỢT XEM */}
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/20 rounded-full mr-4">
                        <MaterialIcons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold" numberOfLines={1}>Quản lý: {job.title}</Text>
                        <View className="flex-row items-center mt-1">
                            <MaterialIcons name="visibility" size={14} color="#fef08a" />
                            <Text className="text-yellow-200 text-xs font-bold ml-1">{job.views_count || 0} lượt xem</Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row">
                    <TouchableOpacity 
                        onPress={() => setActiveTab('EDIT')} 
                        className={`flex-1 pb-3 items-center border-b-4 ${activeTab === 'EDIT' ? 'border-yellow-400' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold text-base ${activeTab === 'EDIT' ? 'text-yellow-400' : 'text-white/60'}`}>Chỉnh sửa tin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('CANDIDATES')} 
                        className={`flex-1 pb-3 items-center border-b-4 ${activeTab === 'CANDIDATES' ? 'border-yellow-400' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold text-base ${activeTab === 'CANDIDATES' ? 'text-yellow-400' : 'text-white/60'}`}>Ứng viên ({candidates.length})</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {activeTab === 'EDIT' && (
                    <View className="flex-1">
                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            className="px-4 pt-6" 
                            contentContainerStyle={{ paddingBottom: 120 }} 
                            keyboardShouldPersistTaps="handled"
                        >
                            <View className="mb-6">
                                <Text className="font-bold text-gray-800 mb-2 ml-1">Ngành nghề</Text>
                                <TouchableOpacity onPress={() => setShowCategoryModal(true)} className="bg-white border border-gray-300 p-4 rounded-xl flex-row justify-between">
                                    <Text className="text-gray-900 font-bold">{selectedCategoryName}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            <View className="bg-white p-5 border border-gray-200 rounded-2xl mb-6 shadow-sm">
                                <Text className="font-bold text-gray-700 mb-2">Tên vị trí tuyển dụng <Text className="text-red-500">*</Text></Text>
                                <TextInput value={title} onChangeText={setTitle} className="bg-gray-100 p-3 rounded-xl mb-4" />

                                <Text className="font-bold text-gray-700 mb-2">Mức lương</Text>
                                <TextInput value={salary} onChangeText={setSalary} className="bg-gray-100 p-3 rounded-xl mb-4" />

                                <Text className="font-bold text-gray-700 mb-2">Địa điểm</Text>
                                <TextInput value={location} onChangeText={setLocation} className="bg-gray-100 p-3 rounded-xl mb-4" />

                                <Text className="font-bold text-gray-700 mb-2">Hạn nộp</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-gray-100 p-4 rounded-xl flex-row justify-between mb-2">
                                    <Text className="text-gray-900 font-bold">{deadlineText}</Text>
                                    <MaterialIcons name="calendar-today" size={20} color="#162E93" />
                                </TouchableOpacity>
                                {showDatePicker && <DateTimePicker testID="dateTimePicker" value={deadlineDate} mode="date" minimumDate={new Date()} onChange={onChangeDate} />}
                            </View>

                            <View className="bg-white p-5 border border-gray-200 rounded-2xl mb-6 shadow-sm">
                                <Text className="font-bold text-gray-700 mb-2">Mô tả công việc <Text className="text-red-500">*</Text></Text>
                                <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={10} textAlignVertical="top" className="bg-gray-100 p-4 rounded-xl" />
                            </View>

                            
                            <TouchableOpacity 
                                onPress={confirmDeleteJob} 
                                disabled={loading} 
                                className={`w-full py-4 rounded-2xl items-center mb-6 shadow-sm ${loading ? 'bg-gray-300' : 'bg-red-500'}`}
                            >
                                <Text className="font-bold text-white text-lg">Xóa tin tuyển dụng</Text>
                            </TouchableOpacity>

                        </ScrollView>

                        
                        <View className="absolute bottom-0 w-full bg-white px-5 py-3 border-t border-gray-100 shadow-2xl pb-6">
                            <TouchableOpacity 
                                onPress={handleUpdateJob} 
                                disabled={loading} 
                                className={`w-full py-4 rounded-2xl items-center shadow-sm ${loading ? 'bg-gray-400' : 'bg-[#162E93]'}`}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white text-lg">Lưu thay đổi</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'CANDIDATES' && (
                    <View className="flex-1 px-4 pt-4">
                        {loadingCandidates ? (
                            <ActivityIndicator size="large" color="#162E93" className="mt-10" />
                        ) : (
                            <FlatList 
                                data={candidates}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderCandidate}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 50 }}
                                ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">Chưa có ứng viên nào nộp vào tin này.</Text>}
                            />
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>

            <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
                <View className="bg-white rounded-t-3xl p-6 absolute bottom-0 w-full" style={{ maxHeight: '60%' }}>
                    <FlatList 
                        data={categories}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => { setSelectedCategory(item.id); setSelectedCategoryName(item.name); setShowCategoryModal(false); }} className="p-4 border-b border-gray-100">
                                <Text className={selectedCategory === item.id ? 'font-bold text-[#162E93]' : 'text-gray-700'}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

export default EditJobPost;