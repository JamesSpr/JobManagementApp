import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { IconButton, Button, Box, FormControl, AppBar, Toolbar, Menu, MenuItem, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import useAuth from "../pages/auth/useAuth";
import useApp from '../context/useApp';
import axios from '../hooks/axios';
import SideBar from './SideBar';
import { openInNewTab } from '../components/Functions';

const Navbar = () => {
    const { auth, setAuth } = useAuth();
    const { app, setApp } = useApp();
    
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    
    const [toggleSidebar, setToggleSidebar] = useState(false);

    useEffect(() => {
        setAuth(prev => ({...prev, sidebar: toggleSidebar}));
    }, [toggleSidebar])

    let navigate = useNavigate();

    const logout = async () => {

        // Remove stored user refresh token and revoke the token
        await axios({
            method: 'post',
            data: JSON.stringify({
                query: `mutation updateUserRefreshToken($id: ID!, $refreshToken: String!){
                    updateUserRefreshToken (id: $id, refreshToken: $refreshToken){
                        user {
                            id
                            username
                            refreshToken
                        }
                    }
                }`,
                variables: {
                    id: auth.user.id,
                    refreshToken: ""
                }
            }),
            withCredentials: true
        }).then((res) => {
            // console.log(res);
        })


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
                    refreshToken: auth.user.refreshToken
                }
            }),
            withCredentials: true
        }).then((res) => {
            // console.log(res);
        })

        setToggleSidebar(false);
        setAuth({});
        navigate('/login');
    }

    const authLinks = () => (
        <>
            <FormControl style={{float:'right', paddingTop:10, paddingRight:15}} >
                <Button variant="outlined" style={{color: 'rgb(60, 60, 60)', border: '0', marginBottom: '10px', width: '161px', marginRight: '16px'}} startIcon={<SearchIcon /> }>Search...</Button>
            </FormControl>
        </>
    );

    // Set the tile whenever something changes it
    const [title, setTitle] = useState("");
    useEffect(() => {
        setTitle(width < 1000 ? app?.title.split(" ")[0] ?? "" : app?.title ?? "");
    }, [app?.title])
    
    // Add listener to capture the width of the window
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
      const updateWindowDimensions = () => {
        const newWidth = window.innerWidth;
        setWidth(newWidth);
      };
  
      window.addEventListener("resize", updateWindowDimensions);
  
      return () => window.removeEventListener("resize", updateWindowDimensions) 
  
    }, []);

    // Shorten the title if the width goes under 1000px
    useEffect(() => {
        setTitle(width < 1000 ? app?.title.split(" ")[0] ?? "" : app?.title ?? "");
    }, [width])

    return (
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" sx={{ zIndex: 999 }}
            style={{backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                <Toolbar>
                    {auth?.user ? 
                        <IconButton size="large" edge="start" color="inherit" aria-label='open-drawer' sx={{ mr: 2}} onClick={(e) => {setToggleSidebar(!toggleSidebar)}}>
                            <MenuIcon style={{color: '#44d62c'}} />
                        </IconButton>
                     : <></>}
                    <IconButton color="primary" aria-label="aurify logo" component="span"
                        onMouseDown={(e) => {
                            if(e.button === 0) {
                                navigate('/'); 
                            }
                            if(e.button === 1) {
                                openInNewTab('/');
                            } 
                        }}>
                        <img alt="Aurify logo" src={"/static/images/aurify_logo.png"} width='145px'/>
                    </IconButton> 

                    <Box sx={{flexGrow:1, textAlign: 'center'}}>
                        {app ? <>
                            <Typography variant='h6'>{title ?? ""}</Typography>
                            <Typography variant='h6'>{app?.subTitle ?? ''}</Typography>
                        </> : <></>}
                    </Box>
                    
                    <Box sx={{flexGrow:0}}>
                        {auth?.user ? authLinks() : <></>}
                    </Box>

                    {auth?.user ? 
                    <Box sx={{flexGrow:0}}>
                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                            style={{float:"right"}}
                        >
                            <AccountCircle style={{color: '#44d62c'}}/>
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem onClick={(e) => navigate('/myaccount')}>My account</MenuItem>
                            <MenuItem onClick={(e) => {handleClose(); navigate('/settings');}}>Settings</MenuItem>
                            <MenuItem onClick={(e) => {handleClose(); logout();}}>Logout</MenuItem>
                        </Menu>
                    </Box>
                    : <></>}
                </Toolbar>
            </AppBar>
            {toggleSidebar && auth?.user ? <SideBar /> : <></>}
        </Box>
    );
}

export default Navbar;
