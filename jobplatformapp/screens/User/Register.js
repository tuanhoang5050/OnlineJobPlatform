import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Image, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const Register = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); 

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword) {
            Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin để đăng ký!");
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
                role: 'CANDIDATE', 
            };

            const response = await axios.post('http://10.0.2.2:8001/api/users/', payload); 

            if (response.status === 201 || response.status === 200) {
                setIsSuccess(true);
            }
        } catch (error) {
            console.error("Lỗi:", error.response?.data || error.message);
            Alert.alert("Đăng ký thất bại", "Email này có thể đã được sử dụng hoặc có lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 pt-5" style={{backgroundColor: "#162E93"}}>
            <SafeAreaView className="flex">
                <View className="flex-row justify-start mt-4">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()} 
                        className="bg-yellow-400 p-2 rounded-tr-2xl rounded-bl-2xl ml-4"
                    >
                        <Text className="font-bold text-black">{'Back'}</Text>
                    </TouchableOpacity>
                </View>
                <View className="flex-row justify-center">
                    <Image 
                        source={require('../../assets/images/login11.png')} 
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
                    <Text className="text-gray-700 font-bold text-2xl text-center mb-4">Tạo tài khoản Ứng viên</Text>

                    <Text className="text-gray-700 ml-1 font-semibold mt-2">Họ và tên</Text>
                    <TextInput
                        placeholder="Nhập vào họ và tên (VD: Nguyễn Văn An)"
                        value={fullName}
                        onChangeText={setFullName}
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
                    />

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
                        className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-5"
                    />

                    <TouchableOpacity 
                        onPress={handleRegister} 
                        disabled={loading}
                        className={`py-4 rounded-2xl mt-2 shadow-sm ${loading ? 'bg-gray-400' : 'bg-yellow-400'}`}
                    >
                        {loading ? (
                            <ActivityIndicator size="large" color="#ffffff" />
                        ) : (
                            <Text className="text-xl font-bold text-center text-gray-800">Đăng ký</Text>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-7">
                        <Text className="text-gray-500 font-semibold">Đã có tài khoản?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text className="text-yellow-500 font-bold ml-1"> Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center mt-4 mb-10">
                        <Text className="text-gray-500 font-semibold">Bạn là nhà tuyển dụng?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('EmployerRegister')}>
                            <Text className="text-yellow-500 font-bold ml-1"> Đăng ký tại đây</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

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
                                Chào mừng bạn đến với ViCareer! Đăng nhập ngay để tìm kiếm công việc phù hợp với bạn!
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

export default Register;