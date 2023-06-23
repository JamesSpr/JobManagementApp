import React, { useEffect, useState } from "react";
import useAuth from "./useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { Button, Grid, TextField, Typography, Tooltip, FormGroup, FormControlLabel, Checkbox, MenuItem } from "@mui/material";

import DoneIcon from '@mui/icons-material/Done';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from "axios";


const MyAccount = () => {
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();

    // Textfield States
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [position, setPosition] = useState('');
    const [role, setRole] = useState('');

    // Preferences
    const [defaultPaginationAmount, setDefaultPaginationAmount] = useState('');

    const [waiting, setWaiting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadStatusMessage, setUploadStatusMessage] = useState('');

    useEffect(() => {
        const cancelToken = axios.CancelToken.source();
        
        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                cancelToken: cancelToken.token,
                data: JSON.stringify({
                    query: `query user($id:ID!){ 
                        user: user(id:$id)
                        {
                            firstName
                            lastName
                            phone
                            position
                            defaultPaginationAmount
                            role
                        }
                    }`,
                    variables: {
                        id: btoa("UserNode:" + auth.user.id)
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.user;
                // console.log(res);
                setFirstName(res.firstName);
                setLastName(res.lastName);
                setPhone(res.phone);
                setPosition(res.position);
                setDefaultPaginationAmount(res.defaultPaginationAmount);
                setRole(res.role);
                
            }).catch((err) => {
                if (axios.isCancel(err)) {
                    // API Request has been cancelled
                    // console.log("API Request Cancelled!");
                } else {
                    // todo:handle error
                    console.log("Please Contact Admin. Error[00001]:", err)
                }
            });
        }
        fetchData();

        return () => {
            cancelToken.cancel();
        }

    }, [])

    const handleUpdateInformation = async () => {
        setWaiting(true);
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation updateUser($id:ID!, $firstName:String!, $lastName:String!, $phone:String!, $position:String!, $defaultPaginationAmount:Int!, $role:String!){ 
                        updateUser(id:$id, firstName: $firstName, lastName: $lastName, phone: $phone, position: $position, defaultPaginationAmount:$defaultPaginationAmount, role:$role)
                        {
                            success
                        }
                    }`,
                    variables: {
                        id: auth.user.id,
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        phone: phone.trim(),
                        position: position.trim(),
                        defaultPaginationAmount: defaultPaginationAmount,
                        role: role.trim(),
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.updateUser;
                 
                if(res.success) {
                    setWaiting(false);
                    setUploadStatusMessage("User Details Updated")
                    setUploadStatus("Success");
                    setTimeout(() => {
                        setUploadStatus('');
                        setUploadStatusMessage("");
                    }, 10000);
                }
                else {
                    // console.log(response);
                    setUploadStatusMessage("Upload Error: " + response?.data?.errors[0]?.message)
                    setWaiting(false);
                    setUploadStatus("Error");
                }
                
            });
        } catch (err) {
            // console.log(err)
            setUploadStatusMessage("Server Error: " + err?.response?.data?.errors[0]?.message)
            setWaiting(false);
            setUploadStatus("Error");
        }
    }

    const handleMYOBConnection = async () => {
        setWaiting(true);
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation myobInitialConnection {
                        myobInitialConnection {
                            success
                            authLink
                        }
                    }`,
                    variables: {},
                }),
            }).then((response) => {
                const res = response?.data?.data?.myobInitialConnection;
                 
                if(res.success) {
                    window.location.replace(res.authLink);
                }
                else {
                    setUploadStatusMessage("Upload Error: " + response?.data?.errors[0]?.message)
                    setWaiting(false);
                    setUploadStatus("Error");
                }
                
            });
        } catch (err) {
            // console.log(err)
            setUploadStatusMessage("Server Error: " + err?.response?.data?.errors[0]?.message)
            setWaiting(false);
            setUploadStatus("Error");
        }
    }

    return (
        <>
            <Grid container spacing={1}>
                <Grid item xs={12} align="center">
                    <Typography variant="h6">{auth.user.username}</Typography>
                </Grid> 
                    
                <Grid item xs={12} align="center">
                    <TextField id="standard-basic" label="First Name" variant="standard" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <TextField id="standard-basic" label="Last Name" variant="standard" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <TextField id="standard-basic" label="Phone" variant="standard" value={phone} onChange={(e) => setPhone(e.target.value)}/>
                </Grid>
                <Grid item xs={12} align="center">
                    <TextField id="standard-basic" label="Position" variant="standard" value={position} onChange={(e) => setPosition(e.target.value)}/>
                </Grid>
                { auth?.user.role === "DEV" ?
                    <Grid item xs={12} align="center">
                        <TextField id="standard-basic" label="Role" variant="standard" value={role} onChange={(e) => setRole(e.target.value)}/>
                    </Grid>
                : <></>}
                <Grid item xs={12} align="center">
                    <TextField select
                        value={defaultPaginationAmount}
                        onChange={e => {
                           setDefaultPaginationAmount(Number(e.target.value))
                        }}
                        sx={{
                            '& .MuiSelect-select': { height:'28px', padding: '2px 5px 2px 10px', fontSize: '0.875rem' },
                        }}
                        style={{height: '32px'}}
                    >
                        {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(pageSize => (
                            <MenuItem key={pageSize} value={pageSize}>
                                {pageSize}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" onClick={handleUpdateInformation}>Update Information</Button> 
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" onClick={handleMYOBConnection}>Connect to MYOB</Button> 
                </Grid>
                <Grid item xs={12} align="center">
                    {waiting ?
                        <>
                            <div className="loader" style={{visibility: waiting ? 'visible' : 'hidden'}}></div>
                            <p className="loader-text" style={{visibility: waiting ? 'visible' : 'hidden'}}>Processing</p>
                        </>
                    :
                        <>
                            <div className="icon" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>
                                <Tooltip title={uploadStatusMessage} placement="top">
                                    {uploadStatus === 'Error' ? <ErrorOutlineIcon color='error'/> :
                                        uploadStatus === 'Success' ? <DoneIcon color='primary'/> : <></>}
                                </Tooltip>
                            </div>
                            <p className="loader-text" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>{uploadStatus}</p>
                        </>
                    }
                </Grid>
            </Grid>             
        </>
    );
}

export default MyAccount;