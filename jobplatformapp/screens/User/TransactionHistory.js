import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOST } from '../../configs/Apis';

const TransactionHistory = ({ navigation }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

    const fetchTransactionHistory = async () => {
    try {
        setLoading(true);
        const token = await AsyncStorage.getItem('access_token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${HOST}/api/transactions/`, config);
        
        const data = response.data.results ? response.data.results : response.data;
        
        
        const successTransactions = data.filter(item => item.status === 'COMPLETED');
        
        setTransactions(successTransactions);
    } catch (error) {
        console.error("Lỗi lấy lịch sử giao dịch:", error);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        fetchTransactionHistory();
    }, []);

    
    const formatDate = (dateString) => {
        if (!dateString) return "Không rõ thời gian";
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    
    const getStatusDetails = (status) => {
        switch (status) {
            case 'COMPLETED': 
                return { text: 'Thành công', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
            case 'CREATED': 
                return { text: 'Đang xử lý', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
            case 'FAILED': 
                return { text: 'Thất bại', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
            default: 
                return { text: status || 'Không rõ', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
        }
    };

    const renderTransactionItem = ({ item }) => {
        const statusDetails = getStatusDetails(item.status);
        
        return (
            <View className="bg-white p-5 mb-4 rounded-2xl shadow-sm border border-gray-100 flex-row justify-between items-center">
                <View className="flex-1 mr-3">
                    <View className="flex-row items-center mb-1">
                        <View className="bg-blue-50 p-2 rounded-xl mr-2">
                            <MaterialIcons name="credit-card" size={20} color="#162E93" />
                        </View>
                        <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>
                            Nâng cấp Tài khoản VIP
                        </Text>
                    </View>
                    <Text className="text-gray-400 text-xs mt-1 font-medium">
                        Mã đơn: {item.payment_id || "Chưa cập nhật"}
                    </Text>
                    <Text className="text-gray-400 text-[11px] mt-0.5">
                        {formatDate(item.created_date)}
                    </Text>
                </View>

                <View className="items-end justify-center">
                   
                    <Text className="font-bold text-xl text-gray-900">
                        ${item.amount}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-lg border mt-1.5 ${statusDetails.bg}`}>
                        <Text className={`text-[11px] font-bold ${statusDetails.color}`}>
                            {statusDetails.text}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#162E93" translucent={true} />
            
           
            <View style={{ backgroundColor: "#162E93", paddingTop: statusBarHeight + 16 }} className="pb-6 px-4 shadow-lg flex-row items-center">
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    className="p-2 bg-white/20 rounded-full mr-4"
                >
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Lịch sử giao dịch</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#162E93" />
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderTransactionItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center mt-24 px-4">
                            <MaterialIcons name="receipt-long" size={72} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4 text-base font-semibold text-center">
                                Bạn chưa thực hiện giao dịch thanh toán nào.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export default TransactionHistory;