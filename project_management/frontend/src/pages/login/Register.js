import React, { useState }  from 'react';
import axios from '../../hooks/axios.js';
import { Button, Grid, Typography, TextField, Tooltip } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { InputField } from '../../components/Components';

const Register = () => {

    // const [firstName, setFirstName] = useState('');
    // const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    // const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [re_password, setRePassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [activationRedirect, setActivationRedirect] = useState(false);

    const [waiting, setWaiting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadStatusMessage, setUploadStatusMessage] = useState('');

    const handleKeyPress = (event) => {
        if(event.key === 'Enter') {
            handleCreateAccount();
        }
    }

    const handleCreateAccount = async () => {

        newAccount

        setWaiting(true);

        // POST details to API
        try {
            await axios({
                method: 'post',
                data: JSON.stringify({
                    query: `
                        mutation Register($firstName: String!, $lastName: String!, $email: String!, $password1:String!, $password2:String!) { 
                            register: register(firstName: $firstName, lastName: $lastName, email: $email, password1: $password1, password2: $password2) {
                                success,
                                errors
                            }
                        }
                    `,
                    variables: {
                        firstName: newAccount['firstName'],
                        lastName: newAccount['lastName'],
                        email: newAccount['email'].toLowerCase(),
                        password1: newAccount['password'],
                        password2: newAccount['rePassword'],
                    }
                }),
                withCredentials: true,
            }).then((response) => {
                const resReg = response?.data?.data?.register;
                console.log(response);
                setWaiting(false);

                if(!resReg?.success){
                    setUploadStatus("Error");
                    switch(resReg.errors.null[0].null){
                        case "password_too_short":
                            setErrorMessage("password");
                            break;
                        case "invalid":
                            setErrorMessage("Enter a valid email address.");
                            break;
                        case "password_mismatch":
                            setErrorMessage("The two password fields didn’t match.");
                            break;
                        case "password_too_common":
                            setErrorMessage("Password is too common. Please Change.")
                            break;
                        case "password_too_similar":
                            setErrorMessage("Password is to similar to username. Please Change")
                            break;
                        case "unique":
                            setErrorMessage("A user with that email already exists.");
                            break;
                        case 'required':
                            setErrorMessage("Please ensure all fields are filled.");
                            break;
                        default: 
                            setErrorMessage("Error not defined. Please report: " +  resReg.errors.null[0].null);
                    }
                } else {
                    setUploadStatus("Success");
                    setUploadStatusMessage("Upload Complete")
                    setErrorMessage("Account Created. Please check you email for the activation link. \n Once activated you can log in.");
                    setActivationRedirect(true);
                }
        });
        } catch (err) {
            console.log(err);
            setWaiting(false);
            if(!err.response) {
                setErrorMessage('No Server Response');
            } else if (err.response?.status === 400){
                setErrorMessage('Bad Creation Request');
            }
            else {
                setErrorMessage('Account Creation Failed');
            }
        }
    }

    const [newAccount, setNewAccount] = useState({
        'firstName': '',
        'lastName': '',
        'email': '',
        'password': '',
        'rePassword': ''
    });
    const handleTextChange = (e) => {
        setNewAccount(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return(
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} align="center">
                <InputField label="First Name" value={newAccount['firstName']} name="firstName" onChange={handleTextChange}/>
                <InputField label="Last Name" value={newAccount['lastName']} name="lastName" onChange={handleTextChange}/>
            </Grid>
            <Grid item xs={12} align="center">
                <InputField label="Email" width={500} value={newAccount['email']} name="email" onChange={handleTextChange}/>
                {/* <InputField id="standard-basic" label="Phone" value={newAccount['phone']} onChange={handleTextChange}/> */}
            </Grid>
            <Grid item xs={12} align="center">
                <InputField label="Password" type="password" value={newAccount['password']} name="password" onChange={handleTextChange}/>
                <InputField label="Confirm Password" type="password" value={newAccount['rePassword']} name="rePassword" onChange={handleTextChange} onKeyPress={handleKeyPress} />
            </Grid>
            <Grid item xs={12} align="center">
                {errorMessage ? <Typography  align="center" color='error' onChange={(e) => setErrorMessage(e.target.value)}>{errorMessage}</Typography> : <></>}
            </Grid>
            <Grid item xs={12} align="center">
                {activationRedirect ? <Button variant="outlined" href="/login">Login</Button> : <Button variant="outlined" onClick={(e) => {handleCreateAccount()}}>Create Account</Button>}
            </Grid>
            <Grid item xs={12} align="center">
                {waiting ?
                    <>
                        <div className="loader" style={{visibility: waiting ? 'visible' : 'hidden'}}></div>
                        <p className="loader-text" style={{visibility: waiting ? 'visible' : 'hidden'}}>Uploading</p>
                    </>
                :
                <> 
                    <div className="icon" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>
                        <Tooltip title={uploadStatusMessage} placement="top">
                            {uploadStatus === 'Error' ? <ErrorOutlineIcon color='error'/> :
                                uploadStatus === 'Success' ? <DoneIcon color='primary' /> : <></>}
                        </Tooltip>
                    </div>
                    <p className="loader-text" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>{uploadStatus}</p>
                </>
                }
            </Grid>
        </Grid>
    );
}

export default Register;