import React, { useState, useEffect }  from 'react';
import axios from '../../hooks/axios';
import { useParams } from "react-router-dom";
import { Button, Grid, Typography,} from '@mui/material';

export default function Activate() {
    const { token } = useParams();
    const [verificationMessage, setVerificationMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                await axios({
                    method: 'post',
                    data: JSON.stringify({
                        query: `
                            mutation VerifyAccount($token: String!) { 
                                verifyAccount: verifyAccount(token: $token)
                                {
                                    success,
                                    errors,
                                }
                            }
                        `,
                        variables: {
                            token: token
                        }
                    }),
                    withCredentials: true,
                }).then((response) => {
                    const VA = response.data.data.verifyAccount;
                    if(VA.success) {
                        setVerificationMessage("Account has been verified. You can now log in.")
                    }
                    else {
                        setVerificationMessage(VA.errors.nonFieldErrors[0].message)
                    }
                }).catch((err) => {
                    // TODO: handle error
                    if(err.name === "CanceledError") {
                        return
                    }
                    console.log("Error:", err);
                });
            } catch (err) {
                console.log(err);
                if(!err.response) {
                    setVerificationMessage('No Server Response');
                } else if (err.response?.status === 400){
                    setVerificationMessage('Bad Request');
                }
                else {
                    setVerificationMessage('Account Activation Failed');
                }
            }
        }

        fetchData();
        
        return () => {
            controller.abort();
        } 
    }, [])

    return (
        <Grid xs={12} align="center">
            <Typography value={verificationMessage} onChange={(e)=> setVerificationMessage(e.target.value)}>{verificationMessage}</Typography>
            <Button href="/login">Login</Button>
        </Grid>
    );
}