import React from "react";

const Tooltip = ({children, title}) => (
    <div class="tooltip">
        {children}
        <span class="tooltiptext">{title}</span>
    </div>
)

export default Tooltip;