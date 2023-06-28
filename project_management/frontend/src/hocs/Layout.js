import React from 'react';
import { styled, createTheme, useTheme, ThemeProvider } from '@mui/material/styles';
import Navbar from './Navbar';
import useAuth from "../pages/auth/useAuth";
import { EstimateProvider } from '../context/EstimateProvider';

const drawerWidth = 115;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
            flexGrow: 1,
            // padding: theme.spacing(3),
            transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
            marginLeft: 0,
            ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
        }),
            marginLeft: `${drawerWidth}px`,
        }),
    }),
);

let theme = createTheme({
    palette: {
        primary: {
            main: "#44d62c"
        },
        secondary: {
            main: "#292626"
        },
        navButton: {
            main: "#9b9b9b"
        }
    },
    components: {
        MuiButton: {
          styleOverrides: {
            root: {
                color: "#292626",
                borderColor: "#292626",
            },
          },
        },
      },
        
})

const Layout = (props) => {  
    const { auth } = useAuth();
    
    return (
        <div id='container'>
            <ThemeProvider theme={theme}>
                <Navbar />
                <EstimateProvider>
                    <Main open={auth?.sidebar}>
                        {props.children}
                    </Main>
                </EstimateProvider>
            </ThemeProvider>
        </div>
    );
};

export default Layout;