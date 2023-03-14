import React, { useState }  from 'react';
import axios from '../../hooks/axios';
import { useNavigate, useParams } from "react-router-dom";
import { Button, Grid, Typography, TextField } from '@mui/material';



export default function PasswordReset() {
    const { token } = useParams();
    let navigate = useNavigate();

    const [success, setSuccess] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [password1, setPassword1] = useState('');
    const [password2, setPassword2] = useState('');
    
    const handleKeyPress = (event) => {
        if(event.key === 'Enter') {
            handleLogin();
        }
    }

    const handlePasswordReset = async () => {
        try {
            await axios({
                method: 'post',
                withCredentials: true,
                data: JSON.stringify({
                    query: `
                        mutation passwordReset($token: String!, $newPassword1: String!, $newPassword2: String!){
                            passwordReset: passwordReset(token: $token, newPassword1: $newPassword1, newPassword2: $newPassword2) {
                                success,
                                errors
                            }
                        } 
                    `,
                    variables: {
                        token: token,
                        newPassword1: password1,
                        newPassword2: password2,
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data?.passwordReset;
                if(res.success) {
                    setSuccess(true);
                    setErrorMessage("Password has been reset.")
                }
                else {
                    setErrorMessage(res.errors.null[0].null)
                }
            });
        } catch (err) {
            if(!err.response) {
                setErrorMessage('No Server Response');
            } else if (err.response?.status === 404){
                setErrorMessage('Bad Login Request');
            }
            else {
                setErrorMessage('Login Failed');
            }
        }
    }


    return(
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} align="center">
                <TextField id="standard-password1-input" label="Password" type="password" variant="standard" value={password1} onChange={(e) => setPassword1(e.target.value)}/>
            </Grid>
            <Grid item xs={12} align="center">
                <TextField id="standard-password2-input" label="Re-enter Password" type="password" variant="standard" value={password2} onChange={(e) => setPassword2(e.target.value)} onKeyPress={(e) => {e.key === 'Enter' ? handlePasswordReset() : null}} />
            </Grid>
            <Grid item xs={12} align="center">
                    <Typography color="error">{errorMessage}</Typography>
                </Grid>
            <Grid item xs={12} align="center">
                {success ? <Button variant="outlined" href="/login">Login</Button>  : <Button variant="outlined" onClick={handlePasswordReset}>Reset Password</Button>}
            </Grid>
        </Grid>
    );
}