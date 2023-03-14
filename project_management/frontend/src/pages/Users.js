import React, { useState, useEffect } from 'react'
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { useNavigate, useLocation } from "react-router-dom"

const Users = () => {
    const [users, setUsers] = useState();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const getUsers = async () => {
            try {
                await axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                        query: `
                            query getUsers{
                                users(last: 10) {
                                    edges {
                                        node {
                                            id,
                                            username,
                                            email,
                                            role,
                                            isActive,
                                            archived,
                                            verified
                                        }
                                    }
                                }
                            }
                        `,
                        variables: {}
                    }),
                    signal: controller.signal
                }).then((response) => {
                    // console.log(response.data);
                    const res = response.data;
                    isMounted && setUsers(res.data.users.edges);
                });
            } catch (err) {
                navigate('/login', { state: { from: location }, replace: true });
            }
        }

        getUsers();

        return () => {
            isMounted = false;
            controller.abort();
        }

    }, [])

    return (
        <article>
            <h2>Users List</h2>
            {users?.length
                ? (
                    <ul>
                        {users.map((user, i) => <li key={i}> {user?.node?.username}</li>)}
                    </ul>
                )
                : <p>No users to display</p>
            }
        </article>
    )
}

export default Users