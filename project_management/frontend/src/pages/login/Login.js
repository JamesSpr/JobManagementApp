import React, { useRef, useState, useEffect }  from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import axios from '../../hooks/axios';
import useAuth from '../auth/useAuth';
import { Button, Grid, Typography } from '@mui/material';
import { InputField, ProgressButton } from '../../components/Components'
import Register from './Register';
// import Register from './Register';

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const { auth, setAuth } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [registering, setRegistering] = useState(false);
    const [forgottenPassword, setForgottenPassword] = useState(false);

    useEffect(() => {
        if(auth?.user) {
            navigate(from, { replace: true });
        }
    }, [])
    
    useEffect(() => {
        setErrorMessage('');
    }, [username, password])

    const handleKeyPress = (event) => {
        if(event.key === 'Enter') {
            handleLogin();
        }
    }

    const [waiting, setWaiting] = useState(false);

    const handleLogin = async () => {
        setWaiting(true);
        try {
            await axios({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation Login($email: String!, $password: String!){
                        tokenAuth: tokenAuth(email: $email, password: $password) {
                            success,
                            errors,
                            unarchiving,
                            token,
                            refreshToken,
                            user {
                                pk, 
                                username,
                                role,
                                refreshToken,
                                defaultPaginationAmount,
                                myobUser {
                                    id
                                }
                            }
                        }
                    }`,
                    variables: {
                        email: username.toLowerCase(),
                        password: password
                    }
                }),
                withCredentials: true
            }).then((response) => {
                console.log(response);
                const TA = response?.data?.data?.tokenAuth;
                if(!TA?.success) {
                    setPassword('');
                    setWaiting(false);
                    
                    if(TA?.errors.nonFieldErrors) {
                        setErrorMessage(TA.errors.nonFieldErrors[0]?.message);
                    } else {
                        setErrorMessage('No Server Response, Please try again.');
                    }
                    // errorRef.current.focus();
                } else {
                    // Reset login form fields
                    setUsername('');
                    setPassword('');
                    successfulLogin(TA);
                }   
            });
        } catch (err) {
            if(!err.response) {
                console.log(err);
                setErrorMessage('No Server Response');
            } else if (err.response?.status === 404){
                setErrorMessage('Bad Login Request');
            }
            else {
                setErrorMessage('Login Failed');
            }
            setWaiting(false);
        }
    }

    const successfulLogin = async (TA) => {
        // Login
        await initialiseJWTRT(TA);
    }

    const initialiseJWTRT = async (TA) => {
        // Initalise http only JWT refresh token cookie
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
                    refreshToken: TA.refreshToken,
                }
            }),
            withCredentials: true,
        }).then((response) => {
            const RT = response?.data?.data?.refreshToken?.refreshToken;

            // Set user refresh token for persistant login
            axios({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation updateUserRefreshToken($id: ID!, $refreshToken: String!){
                        updateUserRefreshToken (id: $id, refreshToken: $refreshToken){
                            user {
                                id
                                username
                                company {
                                    id
                                    name
                                    logoPath
                                }
                                refreshToken
                            }
                        }
                    }`,
                    variables: {
                        id: TA.user.pk,
                        refreshToken: RT
                    }
                }),
                withCredentials: true
            }).then((res) => {
                // Update user refresh token for the auth state
                console.log(TA)
                TA.user.refreshToken = res.data.data.updateUserRefreshToken.user.refreshToken;
                const user = TA?.user;
                const myobUser = TA?.user?.myobUser ?? "";

                user['id'] = user['pk']
                delete user['pk']
                
                setAuth({ "myob": myobUser, "user": user, "accessToken": TA.token });
                navigate(from, { replace: true });
            })          
        });    
    }

    const handleReset = async () => {
        // POST to accounts to reset email
        try {
            await axios({
                method: 'post',
                data: JSON.stringify({
                    query: `
                        mutation sendPasswordResetEmail($email: String!){
                            sendPasswordResetEmail: sendPasswordResetEmail(email: $email) {
                                success,
                                errors
                            }
                        } 
                    `,
                    variables: {
                        email: email
                    }
                }),
            }).then((response) => {
                setErrorMessage("Email has been sent if the account exists.")
            });
              
        } catch (err) {
            console.log(err);
            if(!err.response) {
                setErrorMessage('No Server Response');
            } else if (err.response?.status === 400){
                setErrorMessage('Bad Login Request');
            }
            else {
                setErrorMessage('Password Reset Email Failed');
            }
        }    
    }

    const forgotPage = (
        <React.Fragment>
            <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} align="center">
                    <Typography style={{justifyContent: 'bottom'}}>Enter your email address to recieve an email with a reset link.</Typography>
                </Grid>
                <Grid item xs={12} align="center">
                    <InputField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={(e) => {e.key === 'Enter' ? handleReset() : null}}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <Typography>{errorMessage}</Typography>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" onClick={handleReset}>Send Email</Button>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" onClick={(e) => {setForgottenPassword(false); setErrorMessage('')}}>Back</Button>
                </Grid>
            </Grid>
        </React.Fragment>
    )

    
    const loginPage = (
        <React.Fragment>
            <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} align="center">
                    <InputField label="Email" value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={handleKeyPress}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <InputField type="password" label="Password"  value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={handleKeyPress} />
                </Grid>
                <Grid item xs={12} align="center">
                    <Typography aria-live="assertive" color="error" >{errorMessage}</Typography>
                </Grid>
                <Grid item xs={12} align="center">
                    <ProgressButton name='Login' buttonVariant='outlined' centerButton onClick={handleLogin} waiting={waiting} />
                    {/* <Button variant="outlined" onClick={handleLogin}>Login</Button> */}
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" disabled={waiting} onClick={(e) => {setRegistering(true)}}>Sign Up</Button>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" disabled={waiting} onClick={(e) => {setForgottenPassword(true); setErrorMessage('')}}>Forgot Password</Button>
                </Grid>
            </Grid>
        </React.Fragment>

    )

    return (
        <Grid container spacing={1} alignItems="center" style={{paddingTop: '50px'}}>
            { forgottenPassword ? forgotPage : 
                registering ? <Register /> : 
                loginPage }
        </Grid>
    ); 
}

export default LoginPage;