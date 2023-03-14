import { Box, Button, CircularProgress } from "@mui/material";
import React, { useEffect, useRef } from "react"; 

export const InputField = ({type="text", label, children, multiline, halfWidth, wide, width, error, noMargin, ...props}) => {

    const textareaRef = useRef(null);
    useEffect(() => {
        if(textareaRef && multiline) {
            textareaRef.current.style.height = "0px";
            const scrollHeight = textareaRef.current.scrollHeight - 10;
            textareaRef.current.style.height = scrollHeight + "px";
        }
    }, [props.value])

    let boxStyle = "inputBox"

    let styleClass = "inputField";
    error ? styleClass += " inputFieldError" : '';

    // Custom styles
    if(width) {
        boxStyle += ` width${width}`
        styleClass += " fullWidth";
    }

    if(noMargin) {
        boxStyle += ' no-margin'
    }

    if(halfWidth) {
        styleClass += " halfWidth";
    }
    else if(wide) {
        styleClass += " wideInput";
    }

    return (
        <div className={boxStyle} >
            {type === "select" ? 
                <select className={styleClass} {...props} required>{children}</select> :
                multiline ?
                    <textarea ref={textareaRef} className={styleClass} {...props} required/> :
                    <input className={styleClass} title="" type={type} {...props} required/> 
            }
            <span className={error ? "floating-label inputFieldError" : "floating-label"}>{label}</span>
        </div>
    )
};

export const FileUploadSection = ({onSubmit, waiting, id, type, button}) => ( <>
    <input type="file" id={id} accept={type} className="fileUpload"/>
    <Box sx={{ m: 1, position: 'relative' }}>
        <Button variant="outlined" onClick={onSubmit}>{button}</Button>
        {waiting && (
            <CircularProgress size={24} 
                sx={{
                    colour: 'primary', 
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                }}
            />
        )}
    </Box>
    </>
)

export const ProgressButton = ({name, waiting, onClick, centerButton, buttonVariant="standard"}) => {
    let buttonStyle = "progressButton";
    if(centerButton) {
        buttonStyle += " centered";
    }

    return (
        <Box sx={{ m: 1, position: 'relative' }} className={buttonStyle}>
            <Button name={name.toLowerCase()} variant={buttonVariant} onClick={onClick}>{name}</Button>
            {waiting && (
                <CircularProgress size={24} 
                    sx={{
                        colour: 'primary', 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                    }}
                />
            )}
        </Box>
    )
}

export const Tooltip = ({children, title, centerText}) => {
    if(title !== "") {
        return(
        <div className="tooltip">
            {children}
            <span className="tooltiptext">{title}</span>
        </div>
    )}
    return (<>{children}</>)
}

export const PaginationControls = ({table}) => (
    table ? 
        <div className="pagination-controls" style={{paddingBottom: '5px'}}>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', }}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                {'<<'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', marginLeft:'10px'}}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {'<'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', marginLeft:'10px', marginRight:'10px'}}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                {'>'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px'}}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                {'>>'}
            </button>
            <span style={{paddingLeft: '5px', paddingRight: '5px'}}>
                Page
            </span>
            <strong>
                {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
            </strong>
            <span  style={{paddingLeft: '5px', paddingRight: '5px'}}>
                | Go to page:
                <InputField type="number" noMargin
                    defaultValue={table.getState().pagination.pageIndex + 1}
                    onChange={e => {
                        const page = e.target.value ? Number(e.target.value) - 1 : 0
                        table.setPageIndex(page)
                    }}
                    style={{width: '50px', marginLeft: '5px'}}
                />
            </span>
            <InputField type="select" noMargin
                value={table.getState().pagination.pageSize}
                onChange={e => {
                    table.setPageSize(Number(e.target.value))
                }}
                style={{width: '100px'}}
            >
                {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                        Show {pageSize}
                    </option>
                ))}
            </InputField>
        </div>
    : <></>
)