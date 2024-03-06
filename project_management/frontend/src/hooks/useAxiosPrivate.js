import { axiosPrivate } from "./axios";
import { useEffect } from "react";
import useRefreshToken from "../pages/auth/useRefreshToken";
import useAuth from "../pages/auth/useAuth";

const useAxiosPrivate = () => {
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        // Request interceptors
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if(!config.headers['Authorization']) { // First attempt
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config
            }, (error) => Promise.reject(error)
        );

        // Response interceptors
        const responseIntercept = axiosPrivate.interceptors.response.use(
            async (response) => {
                const prevRequest = response?.config; 
                if(response?.data?.errors && !prevRequest?.sent) {
                    prevRequest.sent = true;
                    const newAccessToken = await refresh();
                    prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return axiosPrivate(prevRequest); // Retry with new access token
                }
                return(response)
            },
            async (error) => {
                // if (error.code === "ERR_CANCELED") {
                //     // aborted in useEffect cleanup
                //     return Promise.resolve({status: 499})
                // }
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }

    }, [auth, refresh])

    return axiosPrivate;
}

export default useAxiosPrivate;