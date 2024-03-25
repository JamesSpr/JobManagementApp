import axios from '../../hooks/axios';
import useAuth from './useAuth';
import { useLocation, useNavigate } from "react-router-dom";

const useRefreshToken = () => {
    let location = useLocation();
    let navigate = useNavigate();
    const { setAuth } = useAuth();

    const refresh = async (): Promise<string> => {
        return await axios({
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
            const res = response?.data?.data?.persist;
            if(res.user && res.accessToken) {
                // Update user auth state
                const {myobUser, ...user} = res.user
                setAuth(prev => ({...prev, user: user, myob: myobUser, accessToken: res.accessToken}));
                return res.accessToken;
            }
            else {
                navigate('/login', {state: {from: location}, replace: true});
                return "";
            }
        }).catch((err) => {
            console.log(err);
            return "";
        })
    }

    return refresh;
}
 
export default useRefreshToken