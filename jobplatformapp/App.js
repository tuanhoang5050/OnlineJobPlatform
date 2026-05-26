import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profile from './screens/User/Profile';
import Login from './screens/User/Login';
import Register from './screens/User/Register';
import EmployerRegister from './screens/User/EmployerRegister';
import Home from './screens/Home/Home';
import JobDetail from './screens/Home/JobDetail';
import SavedJobs from './screens/Home/SavedJob';
import EmployerHome from './screens/Home/EmployerHome';
import EmployerProfile from './screens/User/EmployerProfile';
import AppliedJobs from './screens/Home/AppliedJobs';
import EmployerCandidates from './screens/Home/EmployerCandidates'; // 🔴 IMPORT MÀN HÌNH MỚI
import CreateJobPost from './screens/Home/CreateJobPost'; // 🔴 IMPORT MÀ
import EditJobPost from './screens/Home/EditJobPost'; // 🔴 IMPORT
import EmployerJobManager from './screens/Home/EmployerJobManager'; // 🔴 IMPORT
import Notifications from './screens/Home/Notifications'; // 🔴
import EmployerNotifications from './screens/Home/EmployerNotifications'; // 🔴 IMPORT
import TransactionHistory from './screens/User/TransactionHistory'; // 🔴 IMPORT

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="JobDetail" component={JobDetail} options={{ headerShown: false }} />
        <Stack.Screen name="SavedJobs" component={SavedJobs} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerHome" component={EmployerHome} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerProfile" component={EmployerProfile} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerRegister" component={EmployerRegister} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="AppliedJobs" component={AppliedJobs} options={{ headerShown: false }} /> 
        <Stack.Screen name="CreateJobPost" component={CreateJobPost} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerJobManager" component={EmployerJobManager} options={{ headerShown: false }} />
        <Stack.Screen name="EditJobPost" component={EditJobPost} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerCandidates" component={EmployerCandidates} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} />
        <Stack.Screen name="EmployerNotifications" component={EmployerNotifications} options={{ headerShown: false }} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistory} options={{ headerShown: false }} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}