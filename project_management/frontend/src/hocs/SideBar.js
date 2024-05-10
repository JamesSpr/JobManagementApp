import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Drawer, Toolbar, List, Divider, ListItem, ListItemButton, ListItemText, } from '@mui/material';
import { openInNewTab } from "../components/Functions";

const drawerWidth = 230;

const SideBar = () => {
    
    let navigate = useNavigate();

    const sideBarUpperOptions = ['Clients', 'Contractors', 'Invoices', 'Bills']
    const sideBarLowerOptions = ['Admin', 'Analytics', 'Reports', 'Settings', 'MYOB', 'Timesheets'] // 'Financials', 

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
