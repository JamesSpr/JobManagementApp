import axios from 'axios';
import Cookies from 'js-cookie';
const BASE_URL = 'https://maintenance.aurify.com.au/graphql'

export default axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': Cookies.get('csrftoken')
    }
})

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': Cookies.get('csrftoken'),
    },
    withCredentials: true
})


// try {
//     await axios({
//         method: 'post',
//         data: JSON.stringify({

//         }),
//     }).then((response) => {
        
//     });
// } catch (err) {
//     if(!err.response) {
//         setErrorMessage('No Server Response');
//     } else if (err.response?.status === 404){
//         setErrorMessage('Bad Login Request');
//     }
//     else {
//         setErrorMessage('Login Failed');
//     }
// }
