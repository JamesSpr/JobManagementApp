import { useContext, useDebugValue } from "react";
import AuthContext from "../../context/AuthProvider"
import { AuthContextType } from "../../types/types";

const useAuth = () => {
    // const { auth } = useContext(AuthContext);
    // console.log("USE AUTH: ", auth);
    // useDebugValue(auth, auth => auth?.username ? "Logged In" : "Logged Out");
    return useContext(AuthContext) as AuthContextType;
};

export default useAuth;