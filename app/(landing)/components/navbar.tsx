"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/constants";
import Link from "next/link";

const Navbar = () => {
  const [active, setActive] = useState("Home");
  const [toggle, setToggle] = useState(false);

  return (
    <nav className="w-full flex py-6 justify-between items-center navbar">
      <img src="/assets/logo.png" alt="lynq" className="w-[124px]" />

      <ul className="list-none sm:flex hidden justify-end items-center flex-1">
        {navLinks.map((nav, index) => (
          <li
            key={nav.id}
            className={`font-normal cursor-pointer text-[16px] ${
              active === nav.title ? "text-white" : "text-muted-foreground"
            } ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}`}
            onClick={() => setActive(nav.title)}
          >
            <Link href={`#${nav.id}`}>{nav.title}</Link>
          </li>
        ))}
        <li className="font-normal cursor-pointer text-[16px] text-muted-foreground ml-4">
          <Link href="https://docs-lynq.byharsh.com" target="_blank">
            Docs
          </Link>
        </li>
      </ul>

      <div className="sm:hidden flex flex-1 justify-end items-center">
        <Button
          size="icon"
          variant="ghost"
          className="w-[28px] h-[28px] object-contain"
          onClick={() => setToggle(!toggle)}
        >
          {toggle ? <X /> : <Menu />}
        </Button>

        <div
          className={`${
            !toggle ? "hidden" : "flex"
          } p-6 bg-black-gradient absolute top-20 right-0 mx-4 my-2 min-w-[140px] rounded-xl sidebar`}
        >
          <ul className="list-none flex justify-end items-start flex-1 flex-col">
            {navLinks.map((nav, index) => (
              <li
                key={nav.id}
                className={`font-medium cursor-pointer text-[16px] ${
                  active === nav.title ? "text-white" : "text-muted-foreground"
                } ${index === navLinks.length - 1 ? "mb-0" : "mb-4"}`}
                onClick={() => setActive(nav.title)}
              >
                <a href={`#${nav.id}`}>{nav.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
