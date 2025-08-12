"use client";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabItems } from "@/constants";

const MainTabNavigation = () => {
  return (
    <TabsList className="w-full lg:w-fit mx-auto ">
      {TabItems.map(({ value, label, icon: Icon }) => (
        <TabsTrigger
          key={value}
          value={value}
          className=" flex items-center space-x-2"
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default MainTabNavigation;
