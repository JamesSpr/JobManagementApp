import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { Box, Tab, Tabs, Grid, Dialog, DialogContent, Typography, IconButton } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { FileUploadSection, InputField, Table, ProgressButton, useSkipper } from "../../components/Components";
import { EmployeeType, HTMLElementChange, MYOBUserType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { CheckboxCell } from "../../components/TableHelpers";

const Employees = ({employees, setEmployees, setUpdateRequired, myobUsers, userRoles}:{
    employees: EmployeeType[]
    userRoles: string[]
    setEmployees: React.Dispatch<React.SetStateAction<EmployeeType[]>>,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>,
    myobUsers: MYOBUserType[]
}) => {

    const EditableCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                setUpdateRequired(true);
                table.options.meta?.updateData(index, id, value)
            }
        }

        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <input className="dataTableInput" value={value as any} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    const RoleSelectionCell = ({ getValue, row: {index}, column: { id }, table }:
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
            const initialValue = getValue()
            // We need to keep and update the state of the cell normally
            const [value, setValue] = useState(initialValue)
            const [data, setData] = useState<string[]>([])
            
            // When the input is blurred, we'll call our table meta's updateData function
            const onSelection = (e: { target: { value: any; }; }) => {
                if(initialValue !== value) {
                    setValue(value)
                    setUpdateRequired(true);
                    table.options.meta?.updateData(index, id, value);
                }
            }
            
            // If the initialValue is changed external, sync it up with our state
            useEffect(() => {
                setValue(initialValue)
            }, [initialValue])
    
            useEffect(() => {
                setData(table.options.meta?.getUserRoles())
            }, [])
    
            return (
                <select value={value} onChange={onSelection}
                    style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
                >
                    <option key={'blank'} value=''>{''}</option>
                    {data?.map((user: any) => (
                        <option key={user.name} value={user.name}>{user.description}</option>
                    ))}
                </select>
            )
        }

    const MYOBSelectionCell = ({ getValue, row: {index}, column: { id }, table }:
    { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
        const [data, setData] = useState<MYOBUserType[]>([])
        
        // When the input is blurred, we'll call our table meta's updateData function
        const onSelection = (e: { target: { value: any; }; }) => {
            if(initialValue !== value) {
                setValue(value)
                setUpdateRequired(true);
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        useEffect(() => {
            setData(table.options.meta?.getMyobUsers())
        }, [])

        return (
            <select value={value} onChange={onSelection}
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
            >
                <option key={'blank'} value=''>{''}</option>
                {data?.map((user: any) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                ))}
            </select>
        )
    }

    const [sorting, setSorting] = useState([{"id": "isStaff", "desc": true}, {"id": "firstName", "desc": false}, {"id": "isActive", "desc": true}, ]);

    const columns = useMemo<ColumnDef<EmployeeType>[]>(() => [
        {
            accessorKey: 'isActive',
            header: () => "Active",
            cell: info => {
                const [checked, setChecked] = useState(info.getValue());

                return (
                    <input type="checkbox" checked={checked as boolean} onChange={() => {setChecked(!checked)}} /> 
                )
            },
            size: 60,
        },
        {
            accessorKey: 'email',
            header: () => "Username",
            size: 250,
        },
        {
            accessorKey: 'firstName',
            header: () => "First Name",
            cell: EditableCell,
            size: 150,
        },
        {
            accessorKey: 'lastName',
            header: () => "Last Name",
            cell: EditableCell,
            size: 150,
        },
        {
            accessorKey: 'isStaff',
            header: () => "Maintenance",
            cell: props => CheckboxCell({...props, setUpdateRequired}),
            size: 90,
        },
        {
            accessorKey: 'role',
            header: () => "User Role",
            cell: RoleSelectionCell,
            size: 300,
        },
        {
            id: 'myobUser',
            accessorFn: row => row?.myobUser?.id ?? '',
            header: () => "MYOB Access",
            cell: MYOBSelectionCell,
            size: 300,
        },
        {
            accessorKey: 'myobAccess',
            header: () => "MYOB Access",
            cell: props => CheckboxCell({...props, setUpdateRequired}),
            size: 80,
        }
    ], [])

    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()
    const tableMeta = {
        updateData: (rowIndex: string, columnId: any, value: any) => {
            // setUpdateRequired(true);
            skipAutoResetPageIndex()
            setEmployees(old => old.map((row, index) => {
                if(index === parseInt(rowIndex)) {
                    return {
                        ...old[parseInt(rowIndex)],
                        [columnId]: value,
                    }
                }
                return row;
            }));
        },
        getMyobUsers: () => {
            return myobUsers;
        },
        getUserRoles: () => {
            return userRoles;
        },
    }

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Employee Permissions</p>

                </Grid>
                <Grid item xs={12}>
                    <Table data={employees} setData={setEmployees} sorting={sorting} setSorting={setSorting} columns={columns} tableMeta={tableMeta} autoResetPageIndex={autoResetPageIndex} pagination={true} />
                </Grid>
            </Grid>
        </>
    )
}

export default Employees;