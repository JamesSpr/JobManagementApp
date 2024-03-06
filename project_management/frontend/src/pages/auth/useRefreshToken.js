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
            // console.log("Setting RT", res.data.data.updateUserRefreshToken.user.refreshToken)
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
        let userAuth = auth?.user
            
        // Check if a user has the current JWT-refresh-token 
        await axios({
            method: 'post',
            data: JSON.stringify({
                query: `{
                    userRefreshToken {
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
            console.log("Refresh", response);
            const res = response?.data?.data?.userRefreshToken[0];
            console.log("RT", res);
            if(res) {
                // Update user auth state
                const {myobUser, ...user} = res
                userAuth = user
                setAuth(prev => ({...prev, user: user, myob: myobUser}));
            }
            else {
                navigate('/login', {state: {from: location}, replace: true});
                console.log("No RefreshToken")
                return;
            }
        })

        if(!userAuth) {
            return;
        }

        // console.log("ref", auth.user, userAuth)

        // Get new JWT and Refresh Token
        let updateRequired = false
        let refreshToken = ''
        await axios({
            method: 'post',
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
            console.log("REFRESH TOKEN", res);
            if(!res?.data?.refreshToken?.errors?.nonFieldErrors) {
                setAuth(prev => ({
                        ...prev,
                        accessToken: res.data.refreshToken.token
                }))

                updateRequired = true
                refreshToken = res.data.refreshToken.refreshToken
            }
            else { // Token is not valid
                console.log("Token no longer valid", userAuth?.refreshToken, response)
                setAuth({});
                navigate('/login', {state: {from: location}, replace: true});
                return; 
            }
        }).catch((err) => {
            console.log(err)
        })

        if(updateRequired) {
            await updateUserRefreshToken(userAuth?.id, refreshToken);
            return refreshToken;
        }


        // Revoke old refresh token
        await axios({
            method: 'post',
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
            // console.log("Revoking", userAuth?.refreshToken, res);
        })
    }
    return refresh;
}
 
export default useRefreshToken