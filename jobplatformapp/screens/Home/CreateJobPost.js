import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Platform, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { HOST } from '../../configs/Apis';

const CreateJobPost = ({ navigation }) => {
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const [title, setTitle] = useState('');
    const [salary, setSalary] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState('Chọn ngành nghề...');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [deadlineText, setDeadlineText] = useState(''); 
    const [loading, setLoading] = useState(false);

    // 🔴 State kiểm tra quyền đăng tin
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await AsyncStorage.getItem('access_token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const resCat = await axios.get(`${HOST}/api/categories/`, config);
                setCategories(resCat.data.results ? resCat.data.results : resCat.data);

                const userRes = await axios.get(`${HOST}/api/users/current-user/`, config);
                setIsVerified(userRes.data.is_verified);

            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            }
        };
        fetchData();
    }, []);

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || deadlineDate;
        setShowDatePicker(Platform.OS === 'ios'); 
        setDeadlineDate(currentDate);

        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        setDeadlineText(`${day}/${month}/${year}`);
    };

    const handlePostJob = async () => {
      
        if (!isVerified) {
            Alert.alert(
                "Tài khoản chưa xác thực", 
                "Tài khoản của bạn đang chờ Quản trị viên phê duyệt. Vui lòng quay lại sau nhé!",
                [{ text: "Đã hiểu", onPress: () => navigation.goBack() }]
            );
            return;
        }

        if (!title || !location || !description || !selectedCategory || !deadlineText) {
            Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các trường bắt buộc có dấu (*).");
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return Alert.alert("Lỗi xác thực", "Vui lòng đăng nhập lại.");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const finalDescription = description.replace(/\n/g, '<br/>');
            const dbDeadline = `${deadlineDate.getFullYear()}-${(deadlineDate.getMonth() + 1).toString().padStart(2, '0')}-${deadlineDate.getDate().toString().padStart(2, '0')}`;

            const payload = {
                title: title,
                description: finalDescription,
                salary: salary || "Thỏa thuận",
                location: location,
                category: selectedCategory, 
                deadline: dbDeadline 
            };

            const response = await axios.post(`${HOST}/api/jobs/`, payload, config);

            if (response.status === 201 || response.status === 200) {
                Alert.alert("Thành công", "Tin tuyển dụng của bạn đã được đăng lên hệ thống!", [
                    { text: "Về Bảng tin", onPress: () => navigation.navigate('EmployerHome') }
                ]);
            }
        } catch (error) {
            console.error("Lỗi đăng tin:", error.response?.data || error.message);
            
            if (error.response?.status === 403) {
                Alert.alert("Từ chối truy cập", "Bạn chưa được cấp quyền đăng tin.");
            } else {
                Alert.alert("Đăng tin thất bại", "Có lỗi xảy ra, vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 12 }} className="pb-5 px-4 shadow-lg z-10 flex-row items-center">
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('EmployerHome')} className="p-2 bg-white/20 rounded-full mr-4">
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Đăng tin tuyển dụng mới</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
                
                
                {!isVerified && (
                    <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6 flex-row items-center">
                        <MaterialIcons name="warning" size={24} color="#ef4444" />
                        <Text className="text-red-600 font-medium ml-2 flex-1">
                            Tài khoản của bạn chưa được duyệt. Bạn có thể soạn tin trước nhưng không thể đăng.
                        </Text>
                    </View>
                )}

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 mb-2 ml-1 text-base">Chọn ngành nghề <Text className="text-red-500">*</Text></Text>
                    <TouchableOpacity onPress={() => setShowCategoryModal(true)} className="bg-white border border-gray-300 p-4 rounded-xl flex-row justify-between items-center shadow-sm">
                        <Text className={selectedCategory ? "text-gray-900 font-bold" : "text-gray-400 font-medium"}>{selectedCategoryName}</Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <View className="bg-white p-5 shadow-sm border border-gray-200 rounded-2xl mb-6">
                    <Text className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Thông tin cơ bản</Text>
                    
                    <Text className="font-bold text-gray-700 mb-2">Tên vị trí tuyển dụng <Text className="text-red-500">*</Text></Text>
                    <TextInput value={title} onChangeText={setTitle} className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4" placeholder="VD: Lập trình viên React Native" />

                    <Text className="font-bold text-gray-700 mb-2">Mức lương</Text>
                    <TextInput value={salary} onChangeText={setSalary} className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4" placeholder="VD: 15.000.000 - 25.000.000 VNĐ" />

                    <Text className="font-bold text-gray-700 mb-2">Địa điểm làm việc <Text className="text-red-500">*</Text></Text>
                    <TextInput value={location} onChangeText={setLocation} className="bg-gray-100 p-3 rounded-xl text-gray-800 mb-4" placeholder="VD: Quận 1, TP. Hồ Chí Minh" />

                    <Text className="font-bold text-gray-700 mb-2">Thời hạn ứng tuyển <Text className="text-red-500">*</Text></Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-gray-100 p-4 rounded-xl flex-row justify-between items-center mb-2">
                        <Text className={deadlineText ? "text-gray-900 font-bold" : "text-gray-400 font-medium"}>{deadlineText || "Chọn ngày hết hạn..."}</Text>
                        <MaterialIcons name="calendar-today" size={20} color="#162E93" />
                    </TouchableOpacity>
                    
                    {showDatePicker && (
                        <DateTimePicker testID="dateTimePicker" value={deadlineDate} mode="date" display="default" minimumDate={new Date()} onChange={onChangeDate} />
                    )}
                </View>

                <View className="bg-white p-5 shadow-sm border border-gray-200 rounded-2xl mb-6">
                    <Text className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Chi tiết bài tuyển dụng</Text>

                    <Text className="font-bold text-gray-700 mb-2">Mô tả công việc chi tiết <Text className="text-red-500">*</Text></Text>
                    <TextInput 
                        value={description} 
                        onChangeText={setDescription} 
                        multiline 
                        numberOfLines={8} 
                        textAlignVertical="top" 
                        className="bg-gray-100 p-4 rounded-xl text-gray-800 mb-2" 
                        placeholder="Nhập đầy đủ thông tin:&#10;- Mô tả công việc ứng viên phải làm&#10;- Yêu cầu về kinh nghiệm, kỹ năng&#10;- Các chế độ đãi ngộ, quyền lợi được hưởng..." 
                    />
                </View>
            </ScrollView>

            <View className="absolute bottom-0 w-full bg-white px-5 py-3 border-t border-gray-100 shadow-2xl pb-6 z-10">
                <TouchableOpacity onPress={handlePostJob} disabled={loading} className={`w-full py-4 rounded-2xl items-center justify-center ${loading ? 'bg-gray-400' : 'bg-[#162E93]'}`}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white text-lg">Đăng tin ngay</Text>}
                </TouchableOpacity>
            </View>

            <Modal visible={showCategoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryModal(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
                <View className="bg-white rounded-t-3xl p-6 absolute bottom-0 w-full shadow-2xl" style={{ maxHeight: '60%', minHeight: '40%' }}>
                    <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-4">
                        <Text className="text-xl font-bold text-[#162E93]">Chọn danh mục</Text>
                        <TouchableOpacity onPress={() => setShowCategoryModal(false)} className="bg-gray-100 p-2 rounded-full">
                            <MaterialIcons name="close" size={24} color="#4b5563" />
                        </TouchableOpacity>
                    </View>
                    <FlatList 
                        data={categories}
                        keyExtractor={item => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                onPress={() => {
                                    setSelectedCategory(item.id);
                                    setSelectedCategoryName(item.name);
                                    setShowCategoryModal(false);
                                }}
                                className={`p-4 border-b border-gray-100 flex-row justify-between items-center ${selectedCategory === item.id ? 'bg-blue-50 rounded-xl border-b-0' : ''}`}
                            >
                                <Text className={`text-base ${selectedCategory === item.id ? 'font-bold text-[#162E93]' : 'text-gray-700'}`}>{item.name}</Text>
                                {selectedCategory === item.id && <MaterialIcons name="check-circle" size={24} color="#162E93" />}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

export default CreateJobPost;