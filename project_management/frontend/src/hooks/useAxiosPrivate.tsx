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
                    config.headers['Authorization'] = `JWT ${auth?.accessToken}`;
                }
                return config
            }, (error) => Promise.reject(error)
        );

        // Response interceptors
        const responseIntercept = axiosPrivate.interceptors.response.use(
            async (response) => {
                const prevRequest = response?.config; 
                response?.data?.errors && console.log(response?.data?.errors)
                if(response?.data?.errors && !prevRequest?.headers.sent) {
                    prevRequest.headers.sent = true;
                    const newAccessToken = await refresh();
                    prevRequest.headers['Authorization'] = `JWT ${newAccessToken}`;
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
