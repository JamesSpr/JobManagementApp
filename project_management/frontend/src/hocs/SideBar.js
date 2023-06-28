import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Drawer, Toolbar, List, Divider, ListItem, ListItemButton, ListItemIcon, ListItemText, } from '@mui/material';

const drawerWidth = 230;

const SideBar = () => {
    
    let navigate = useNavigate();
    
    const openInNewTab = (url) => {
        const newWindow = window.open(url, '_blank', 'noopener, noreferrer')
        if(newWindow) newWindow.opener = null
    }

    const sideBarUpperOptions = ['Clients', 'Contractors', 'Invoices', 'Bills']
    const sideBarLowerOptions = ['Admin', 'Analytics', 'Settings', 'MYOB'] // 'Financials', 

    return(
        <Drawer
            variant="permanent"
            sx={{
            width: drawerWidth,

            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', zIndex: '998' },
            }}
        >
            <Toolbar />
            <Box sx={{ overflow: 'auto' }}>
            <List>
                {sideBarUpperOptions.map((text, index) => (
                <ListItem key={text} disablePadding>
                    <ListItemButton onMouseDown={(e) => {
                        if(e.button === 0) {
                            navigate('/' + text.toLowerCase())
                        }
                        if(e.button === 1) {
                            openInNewTab('/' + text.toLowerCase());
                        } 
                    }}>
                    {/* <ListItemIcon> */}
                        {/* {index % 2 === 0 ? <InboxIcon /> : <MailIcon />} */}
                    {/* </ListItemIcon> */}
                    <ListItemText primary={text} />
                    </ListItemButton>
                </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                {sideBarLowerOptions.map((text, index) => (
                <ListItem key={text} disablePadding>
                    <ListItemButton onMouseDown={(e) => {
                        if(e.button === 0) {
                            navigate('/' + text.toLowerCase())
                        }
                        if(e.button === 1) {
                            openInNewTab('/' + text.toLowerCase());
                        } 
                    }}>
                    {/* <ListItemIcon> */}
                        {/* {index % 2 === 0 ? <InboxIcon /> : <MailIcon />} */}
                    {/* </ListItemIcon> */}
                    <ListItemText primary={text} />
                    </ListItemButton>
                </ListItem>
                ))}
            </List>
            </Box>
        </Drawer>
    );

}

export default SideBar;
