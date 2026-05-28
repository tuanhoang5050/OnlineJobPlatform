import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Image, ScrollView, Modal, FlatList } from 'react-native';
import { Alert, ActivityIndicator } from 'react-native'; 
import API, { endpoints } from '../../../configs/Apis'; 
import axios from 'axios';

const EmployerRegister = ({ navigation }) => {
    const [fullName, setFullName] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('Nam'); 
    const [location, setLocation] = useState('');
    const [companyName, setCompanyName] = useState(''); 
    const [isSuccess, setIsSuccess] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false); 

    const cities = [
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bạc Liêu', 'Bắc Giang', 'Bắc Kạn', 'Bắc Ninh', 'Bến Tre', 
    'Bình Dương', 'Bình Định', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Cần Thơ', 
    'Đà Nẵng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 
    'Hà Nam', 'Hà Nội', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hồ Chí Minh', 
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lạng Sơn', 'Lào Cai', 'Lâm Đồng', 
    'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 
    'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 
    'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 
    'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái', 'Khác...'
    ];

    const handleRegister = async () => {
        if (!email || !password || !fullName || !phone || !location || !companyName) {
            Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin!");
            return;
        }

        
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone.trim())) {
            Alert.alert("Số điện thoại không hợp lệ", "Vui lòng nhập số điện thoại hợp lệ!");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Lỗi mật khẩu", "Mật khẩu xác nhận không khớp!");
            return;
        }

        setLoading(true);

        try {
            const nameParts = fullName.trim().split(' ');
            const lName = nameParts[0]; 
            const fName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''; 

            const payload = {
                username: email, 
                email: email,
                password: password,
                first_name: fName,
                last_name: lName,
                phone_number: phone, 
                sex: gender === 'Nam' ? 'NAM' : (gender === 'Nữ' ? 'NU' : 'KHAC'), 
                location: location,
                company_name: companyName,
                role: 'EMPLOYER', 
            };

            const response = await axios.post('http://10.0.2.2:8001/api/users/', payload); 

            if (response.status === 201 || response.status === 200) {
                setIsSuccess(true);
            }
        } catch (error) {
            console.error("Lỗi:", error.response?.data || error.message);
            Alert.alert("Đăng ký thất bại", "Email này có thể đã được sử dụng hoặc có lỗi xảy ra.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 pt-5" style={{backgroundColor: "#162E93"}}>
            <SafeAreaView className="flex" >
                <View className="flex-row justify-start mt-4" >
                    <TouchableOpacity
                        onPress={() => navigation.goBack()} 
                        className="bg-yellow-400 p-2 rounded-tr-2xl rounded-bl-2xl ml-4"
                    >
                        <Text className="font-bold text-black">{'Back'}</Text>
                    </TouchableOpacity>
                </View>
                <View className="flex-row justify-center">
                    <Image 
                        source={require('../../../assets/images/login11.png')} 
                        style={{ width: 150, height: 150 }} 
                        resizeMode="contain"
                    />
                </View>
            </SafeAreaView>

            <View 
                className="flex-1 bg-white px-8 pt-6 mt-4"
                style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} className="form space-y-2">
                    <Text className="text-gray-700 font-bold text-2xl text-center mb-4">Tạo tài khoản Nhà tuyển dụng</Text>

                    <Text className="text-gray-700 ml-1 font-semibold">Địa chỉ Email</Text>
                    <TextInput
                        placeholder="Nhập vào địa chỉ email..."
                        value={email}
                        onChangeText={setEmail}
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text className="text-gray-700 ml-1 font-semibold">Mật khẩu</Text>
                    <TextInput
                        placeholder="Nhập vào mật khẩu..."
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />

                    <Text className="text-gray-700 ml-1 font-semibold">Xác nhận mật khẩu</Text>
                    <TextInput
                        placeholder="Xác nhận lại mật khẩu..."
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={true}
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />

                    <Text className="text-gray-700 ml-1 font-semibold mt-2">Họ và tên</Text>
                    <TextInput
                        placeholder="Nhập vào họ và tên (VD: Nguyễn Văn An)"
                        value={fullName} 
                        onChangeText={setFullName} 
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />

                    <Text className="text-gray-700 ml-1 font-semibold">Tên công ty</Text>
                    <TextInput
                        placeholder="Nhập tên công ty/doanh nghiệp"
                        value={companyName} 
                        onChangeText={setCompanyName} 
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />
                    
                    <Text className="text-gray-700 ml-1 font-semibold">Số điện thoại cá nhân</Text>
                    <TextInput
                        placeholder="Nhập vào số điện thoại cá nhân"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="numeric" 
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />

                    <Text className="text-gray-700 ml-1 font-semibold mb-2 mt-2">Giới tính</Text>
                    <View className="flex-row items-center mb-4 ml-1 space-x-6">
                        <TouchableOpacity onPress={() => setGender('Nam')} className="flex-row items-center">
                            <View className={`w-5 h-5 border-2 rounded-full items-center justify-center mr-2 ${gender === 'Nam' ? 'border-yellow-400' : 'border-gray-400'}`}>
                                {gender === 'Nam' && <View className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />}
                            </View>
                            <Text className="text-gray-700">Nam</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setGender('Nữ')} className="flex-row items-center">
                            <View className={`w-5 h-5 border-2 rounded-full items-center justify-center mr-2 ${gender === 'Nữ' ? 'border-yellow-400' : 'border-gray-400'}`}>
                                {gender === 'Nữ' && <View className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />}
                            </View>
                            <Text className="text-gray-700">Nữ</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-700 ml-1 font-semibold">Địa điểm làm việc</Text>
                    <TouchableOpacity 
                        onPress={() => setModalVisible(true)} 
                        className="p-4 bg-gray-100 rounded-2xl mb-5 flex-row justify-between items-center"
                    >
                        <Text className={location ? "text-gray-700" : "text-gray-400"}>
                            {location ? location : "Chọn tỉnh/thành phố"}
                        </Text>
                        <Text className="text-gray-500">▼</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="py-4 bg-yellow-400 rounded-2xl mt-2 shadow-sm"
                        onPress={handleRegister}
                        disabled={loading} 
                    >
                       
                        <Text className="text-xl font-bold text-center text-gray-800">Đăng ký</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-7 mb-10">
                        <Text className="text-gray-500 font-semibold">Đã có tài khoản?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text className="text-yellow-500 font-bold ml-1"> Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)} 
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl max-h-96 w-full p-5">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-800">Chọn địa điểm</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text className="text-blue-700 font-bold text-lg">Đóng</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={cities}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    className="py-4 border-b border-gray-200"
                                    onPress={() => {
                                        setLocation(item); 
                                        setModalVisible(false); 
                                    }}
                                >
                                    <Text className={`text-lg ${location === item ? "text-yellow-500 font-bold" : "text-gray-700"}`}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isSuccess}
                onRequestClose={() => setIsSuccess(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View 
                        className="bg-white px-9 pt-8 pb-10"
                        style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50 }}
                    >
                        <View className="items-center">
                            <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-5">
                                <Text className="text-6xl text-green-500 font-bold">✓</Text>
                            </View>
                            
                            <Text className="text-2xl font-bold text-gray-800 mb-3">Đăng ký thành công!</Text>
                            
                            <Text className="text-center text-gray-500 mb-8 text-base">
                                Tài khoản Nhà tuyển dụng của bạn đã được tạo. Vui lòng đợi Admin phê duyệt trước khi bạn có thể đăng tin.
                            </Text>
                            
                            <TouchableOpacity 
                                onPress={() => {
                                    setIsSuccess(false); 
                                    navigation.navigate('Login'); 
                                }}
                                className="w-full py-4 bg-yellow-400 rounded-2xl shadow-sm"
                            >
                                <Text className="text-xl font-bold text-center text-gray-800">Đi đến Đăng nhập</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default EmployerRegister;