import axios from 'axios';

export const HOST = 'http://10.0.2.2:8001'; 

export const endpoints = {
    'login': '/api/users/login/',
    'register': '/api/users/register/',
    'current-user': '/api/users/current-user/',
    'jobs': '/api/jobs/',
};

export const authApi = () => {
    return axios.create({
        baseURL: HOST,
    });
};

export default axios.create({
    baseURL: HOST,
});