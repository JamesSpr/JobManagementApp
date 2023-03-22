import axios from '../../hooks/axios';
import useAuth from './useAuth';
import { useLocation, useNavigate } from "react-router-dom";

const useRefreshToken = () => {
    let location = useLocation();
    let navigate = useNavigate();
    const { auth, setAuth } = useAuth();

    const updateUserRefreshToken = async (id, refreshToken) => {
        // Set user refresh token for persistant login
        await axios({
            method: 'post',
            data: JSON.stringify({
                query: `mutation updateUserRefreshToken($id: ID!, $refreshToken: String!){
                    updateUserRefreshToken (id: $id, refreshToken: $refreshToken){
                        user {
                            id
                            username
                            refreshToken
                            myobUser {
                                id
                            }
                        }
                    }
                }`,
                variables: {
                    id: id,
                    refreshToken: refreshToken
                }
            }),
            withCredentials: true
        }).then((res) => {
            console.log("Setting RT", res.data.data.updateUserRefreshToken.user.refreshToken)
            setAuth(prev => ({
                ...prev, 
                user: {
                    ...prev.user,
                    'refreshToken': res.data.data.updateUserRefreshToken.user.refreshToken
                }
            }))
        })
    }

    const refresh = async () => {

        // If the auth state is empty for persistance
        let userAuth = auth?.user
        // if(!auth?.user) {
        // Check if a user has the current JWT-refresh-token 
        await axios({
            method: 'post',
            // signal: controller.signal,
            data: JSON.stringify({
                query: `{
                    userRefreshToken{
                        id
                        username
                        refreshToken
                        role
                        defaultPaginationAmount
                        company {
                            id
                            name
                            logoPath
                        }
                        myobUser {
                            id
                        }
                    }
                }`,
                variables: {}
            }),
            withCredentials: true,
        }).then((response) => {
            // console.log("Refresh", response);
            const res = response?.data?.data?.userRefreshToken[0];
            // console.log("RT", res);
            if(res) {
                // Update user auth state
                const {myobUser, ...user} = res
                userAuth = user
                setAuth(prev => ({...prev, user: user, myob: myobUser}));
            }
        })
        // }

        // console.log("ref", auth.user, userAuth)

        // Get new JWT and Refresh Token
        await axios({
            method: 'post',
            // cancelToken: cancelToken,
            // signal: controller.signal,
            data: JSON.stringify({
                query: `
                    mutation RefreshToken($refreshToken: String!){
                        refreshToken: refreshToken(refreshToken: $refreshToken){
                            success,
                            errors,
                            payload,
                            token,
                            refreshToken
                        }
                    }
                `,
                variables: {
                    refreshToken: userAuth?.refreshToken,
                }
            }),
            withCredentials: true,
        }).then((response) => {
            const res = response.data;
            // console.log("REFRESH TOKEN", res);
            if(!res?.data?.refreshToken?.errors?.nonFieldErrors) {
                setAuth(prev => {
                    // console.log(JSON.stringify(prev));
                    // console.log("RT:", res.data.refreshToken.token);
                    
                    updateUserRefreshToken(userAuth?.id, res.data.refreshToken.refreshToken);
                    return {
                        ...prev,
                        // username: res.data.payload.username,
                        accessToken: res.data.refreshToken.token
                    }
                })
                console.log(res.data.refreshToken.token)
                return res.data.refreshToken.token;
            }
            else { // Token is not valid
                console.log("Token no longer valid", userAuth?.refreshToken, response)
                setAuth({});
                navigate('/login', {state: {from: location}, replace: true});
                return;
            }
        })
        // .catch((err) => {
        //     if (axiosInstance.isCancel(err)) {
        //         // API Request has been cancelled
        //         // console.log("API Request Cancelled!");
        //     } else {
        //         //todo:handle error
        //         console.log("Please Contact Admin. Error[00001]:", err)
        //     }
        // });

        // Revoke old refresh token
        await axios({
            method: 'post',
            // cancelToken: cancelToken,
            // signal: controller.signal,
            data: JSON.stringify({
                query: `mutation revokeToken($refreshToken: String!) {
                    revokeToken: revokeToken(refreshToken: $refreshToken) {
                        success
                        errors
                    }
                }`,
                variables: {
                    refreshToken: userAuth?.refreshToken
                }
            }),
            withCredentials: true
        }).then((res) => {
            console.log("Revoking", userAuth?.refreshToken, res);
        })
        // .catch((err) => {
        //     if (axiosInstance.isCancel(err)) {
        //         // API Request has been cancelled
        //         // console.log("API Request Cancelled!");
        //     } else {
        //         //todo:handle error
        //         console.log("Please Contact Admin. Error[00001]:", err)
        //     }
        // });
    }
    return refresh;
}
 
export default useRefreshToken