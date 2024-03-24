import axios from '../../hooks/axios';
import useAuth from './useAuth';
import { useLocation, useNavigate } from "react-router-dom";

const useRefreshToken = () => {
    let location = useLocation();
    let navigate = useNavigate();
    const { setAuth } = useAuth();

    const refresh = async () => {
        await axios({
            method: 'post',
            data: JSON.stringify({
                query: `mutation {
                        persist: persistLogin {
                            user {
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
                            accessToken
                        }
                    }
                `,
                variables: {}
            }),
            withCredentials: true,
        }).then((response) => {
            console.log("Refresh", response);
            const res = response?.data?.data?.persist;
            console.log("user", res);
            if(res.user && res.accessToken) {
                // Update user auth state
                const {myobUser, ...user} = res.user
                setAuth(prev => ({...prev, user: user, myob: myobUser, accessToken: res.accessToken}));
                return res.accessToken;
            }
            else {
                navigate('/login', {state: {from: location}, replace: true});
                // console.log("No RefreshToken")
                return;
            }
        }).catch((err) => {
            console.log(err);
        })

    }
    return refresh;
}
 
export default useRefreshToken