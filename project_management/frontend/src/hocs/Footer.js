import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';

const Footer = ({location}) => {
    return(
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
            style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                <Toolbar style={{minHeight: '50px'}}>
                    {location === "/" ?
                        <Box style={{margin: '0 auto', justifyContent: 'space-evenly'}}>
                            <Button>Create New Job</Button>
                            <Button>Open Selected</Button>
                            <Button>Bulk Update</Button>
                        </Box>
                    : <></>}
                    {location.includes("/job/edit") ?
                        <Box style={{margin: '0 auto', justifyContent: 'space-evenly'}}>
                        </Box>
                    : <></>}
                </Toolbar>
            </AppBar>
        </Box>
    );
}

export default Footer;