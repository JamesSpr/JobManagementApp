import React from "react";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";
import { Box, CircularProgress } from "@mui/material";
import axios from 'axios';

const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        const verifyRefreshToken = async () => {
            try {
                await refresh();
            } catch (err) {
                // console.error(err);
            } finally {
                setIsLoading(false);
            }
        }

        !auth?.accessToken ? verifyRefreshToken() : setIsLoading(false);
    }, [])
 
    useEffect(() => {
        // console.log(`isLoading: ${isLoading}`);
        // console.log(`aT: ${JSON.stringify(auth?.accessToken)}`);
    }, [isLoading])

    return (
        <>
            {isLoading
                ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                        <CircularProgress />
                    </Box>
                : <Outlet />
            }
        </>
    )    
}

export default PersistLogin;