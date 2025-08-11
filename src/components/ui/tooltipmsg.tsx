import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface TooltipmsgProps {
  msg: string;
  children: React.ReactNode;
}

const Tooltipmsg = ({ msg, children }: TooltipmsgProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{msg}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default Tooltipmsg;
