import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { MaterialIcons } from '@expo/vector-icons';

const Login = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false); 

    const clientId = process.env.EXPO_PUBLIC_CLIENT_ID;
    const clientSecret = process.env.EXPO_PUBLIC_CLIENT_SECRET;

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
            return;
        }

        setLoading(true);

        try {
            const payload = new URLSearchParams();
            payload.append('grant_type', 'password');
            payload.append('username', email); 
            payload.append('password', password);
            payload.append('client_id', clientId); 
            payload.append('client_secret', clientSecret); 

            const response = await axios.post('http://10.0.2.2:8001/o/token/', payload.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                const token = response.data.access_token;
                await AsyncStorage.setItem('access_token', token);
                
                // 🔴 BƯỚC MỚI: GỌI API LẤY THÔNG TIN USER ĐỂ CHECK ROLE & ID
                const userRes = await axios.get('http://10.0.2.2:8001/api/users/current-user/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const userData = userRes.data;
                const role = userData.role;
                
                // Lưu ID và Role vào máy
                await AsyncStorage.setItem('current_user_id', String(userData.id));
                await AsyncStorage.setItem('user_role', role); 

                // 🔴 RẼ NHÁNH ĐIỀU HƯỚNG
                if (role === 'EMPLOYER') {
                    navigation.reset({ index: 0, routes: [{ name: 'EmployerHome' }] });
                } else {
                    navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); 
                }
            }

        } catch (error) {
            console.error("Lỗi đăng nhập:", error.response?.data || error.message);
            Alert.alert('Đăng nhập thất bại', 'Sai tài khoản, mật khẩu hoặc lỗi máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // 🔴 1. BỌC KEYBOARD AVOIDING VIEW Ở NGOÀI CÙNG
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: "#162E93" }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor="#162E93" />

            {/* 🔴 2. BỌC SCROLLVIEW ĐỂ CÓ THỂ CUỘN LÊN KHI BÀN PHÍM XUẤT HIỆN */}
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1 }} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled" // Giúp bấm nút Đăng nhập mượt hơn mà không cần ẩn bàn phím trước
            >
                {/* Phần Logo bên trên */}
                <View className="flex items-center pt-12 pb-4">
                    <View className="flex-row justify-center">
                        <Image 
                            source={require('../../assets/images/login.png')} 
                            style={{ width: 250, height: 260 }} 
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Phần Form màu trắng bên dưới */}
                <View 
                    className="flex-1 bg-white px-9 pt-3 justify-center"
                    style={{ borderTopLeftRadius: 35, borderTopRightRadius: 35 }}
                >
                    <View className="form space-y-2 mt-4">
                        <Text className="text-gray-700 font-bold text-xl text-center mb-3">Chào mừng bạn đến với ViCareer</Text>
                        

                        <TextInput
                        
                            placeholder="Nhập vào địa chỉ email..."
                            value={email}
                            onChangeText={setEmail}
                            className="p-4 bg-gray-100 text-gray-700 rounded-3xl mb-3"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        
                        <TextInput
                            placeholder="Nhập vào mật khẩu..."
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                            className="p-4 bg-gray-100 text-gray-700 rounded-3xl"
                        />

                        <TouchableOpacity className="flex items-end mb-2 mt-2">
                            <Text className="text-yellow-500 font-semibold">Quên mật khẩu?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={handleLogin}
                            disabled={loading}
                            className={`py-4 rounded-3xl shadow-sm ${loading ? 'bg-gray-400' : 'bg-yellow-400'}`}
                        >
                            {loading ? (
                                <ActivityIndicator size="large" color="#ffffff" />
                            ) : (
                                <Text className="text-xl font-bold text-center text-gray-700">Đăng nhập</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text className="text-lg text-gray-500 font-bold text-center py-3">Hoặc đăng nhập với</Text>

                    <View className="flex-row justify-center space-x-6">
                        <TouchableOpacity className="p-3 bg-gray-100 rounded-3xl">
                            <Image source={require('../../assets/images/google.png')} className="w-10 h-10" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-3 bg-gray-100 rounded-3xl">
                            <Image source={require('../../assets/images/facebook.png')} className="w-10 h-10" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center mt-3">
                        <Text className="text-gray-500 font-semibold">Không có tài khoản?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text className="text-yellow-500 font-bold ml-1"> Đăng ký</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center mt-2 mb-8">
                        <Text className="text-gray-500 font-semibold">Bạn là Nhà tuyển dụng?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('EmployerRegister')}>
                            <Text className="text-yellow-500 font-bold ml-1"> Đăng ký tại đây</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default Login;