import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profile from './screens/User/Candidate/Profile';
import Login from './screens/User/Login';
import Register from './screens/User/Candidate/Register';
import EmployerRegister from './screens/User/Employer/EmployerRegister';
import Home from './screens/Home/Candidate/Home';
import JobDetail from './screens/Home/Candidate/JobDetail';
import SavedJobs from './screens/Home/Candidate/SavedJob';
import EmployerHome from './screens/Home/Employer/EmployerHome';
import EmployerProfile from './screens/User/Employer/EmployerProfile';
import AppliedJobs from './screens/Home/Candidate/AppliedJobs';
import EmployerCandidates from './screens/Home/Employer/EmployerCandidates'; 
import CreateJobPost from './screens/Home/Employer/CreateJobPost'; 
import EditJobPost from './screens/Home/Employer/EditJobPost'; 
import EmployerJobManager from './screens/Home/Employer/EmployerJobManager'; 
import Notifications from './screens/Home/Candidate/Notifications'; 
import EmployerNotifications from './screens/Home/Employer/EmployerNotifications'; 
import TransactionHistory from './screens/User/TransactionHistory'; 


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