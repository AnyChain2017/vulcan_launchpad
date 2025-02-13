"use client";
import React from "react";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Contract, providers } from "ethers";
import { Tooltip } from "@nextui-org/react";
//hooks
import useActiveWeb3 from "@/hooks/useActiveWeb3";
import ClipboardCopier from "@/components/share/clipCopier";
import { QRCode } from 'react-qrcode-logo';
import useToastr from "@/hooks/useToastr";
//abis
import ICO from "@/constants/abis/ICO.json";
import { baseURL } from "@/constants/config";
// types
import { IUSER, IProject, IToken } from "@/types";
import { reduceAmount } from "@/utils";
import { formatEther, formatUnits } from "viem";
// utils
import { copyToClipboard } from "@/utils";
import axios from "axios";
// constants
import { CHAIN_DATA } from "@/constants/constants";
// router
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useAsyncEffect from "use-async-effect";


const LaunchPad = ({ params }: { params: { id: string } }) => {
  // const { address, chainId, signer } = useActiveWeb3();
  const [contract, setContract] = React.useState<Contract | undefined>(
    undefined
  );
  const [token, setToken] = React.useState<IToken | undefined>(undefined);
  const [price, setPrice] = React.useState<bigint>(BigInt("0"));
  const [hardcap, setHardcap] = React.useState<bigint>(BigInt("0"));
  const [balance, setBalance] = React.useState<number>(0);
  // router
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const chainId = searchParams.get("chainId") ?? "";


  const { showToast } = useToastr();

  const router = useRouter();

  // const { chain } = useActiveWeb3 ();

  const handleCopyAddress = async () => {
    showToast("Copied address to clipboard", "success");
    await copyToClipboard(id);
  };

  useAsyncEffect(async () => {
    try {
      const _rpc = CHAIN_DATA[chainId].rpc;
      const _jsonRpcProvider = new providers.JsonRpcProvider(_rpc);
      const _contract = new Contract(id, ICO, _jsonRpcProvider);
      const _token = await _contract.tokenInfo();
      setToken(_token);
      setPrice(_token.price);
      const _hardcap = await _contract.hardcap();
      setHardcap(_hardcap);
      const _balance = await _contract.tokensAvailable();
      setBalance(Number(formatUnits(_balance, Number(_token.decimal))));
    } catch (err) {
      console.log(err)
      console.log("error")
    }
  }, [])

  // const _depositAmountToSoftcap = React.useMemo(() => {
  //   if (Number(price) === 0) {
  //     return BigInt("0");
  //   } else {
  //     return softcap / price;
  //   }
  // }, [price, softcap]);
  //@dev deposit token amount to reach hardcap
  const _depositAmountToHardcap = React.useMemo(() => {
    if (price === BigInt("0") || hardcap === BigInt("0")) {
      return 0;
    } else {
      const _amount = hardcap / price;
      // return _amount;
      console.log({ price, hardcap, _amount })
      return Math.ceil(Number(_amount));
    }
  }, [price, hardcap]);

  return (
    <div className="w-full">
      <div className="flex gap-2 justify-between items-center pr-3 mt-5">
        <span
          onClick={() => router.push("/")}
          className="py-2 dark:text-white text-gray-700 cursor-pointer hover:underline flex items-center gap-1 text-sm font-bold px-4"
        >
          <Icon icon="icon-park-solid:back" width={15} height={15} /> Return to
          Vulcan Pad
        </span>
      </div>
      <h2 className="text-lg font-bold text-center dark:text-white mt-20">
        {
          _depositAmountToHardcap > balance ?
            <>** You need to deposit <span className="text-lg text-green-600 font-bold">{String(_depositAmountToHardcap - balance)} tokens</span> to reach your hard cap and start this ICO **</> :
            <>** ICO has been started **</>
        }
      </h2>

      <h3 className="text-center dark:text-white text-sm mt-5">( charged {balance} tokens )</h3>

      <div className="dark:text-white text-black text-sm mt-8 flex gap-1 items-center justify-center">
        <span
          onClick={handleCopyAddress}
          className="hover:underline cursor-pointer w-[100px] xs:w-auto truncate"
        >
          {id}
        </span>
        <ClipboardCopier size={22} text={id} />
        <Tooltip content="Go to chain" className="p-2 text-white bg-black">
          <a
            href={`${CHAIN_DATA[chainId]?.explorer}/address/${id}`}
            target="_blank"
          >
            <Icon
              className="cursor-pointer"
              icon="fluent:open-16-filled"
              width={22}
            />
          </a>
        </Tooltip>
      </div>

      <div className="w-full flex justify-center relative mt-5">
        <div className="p-3 rounded-md bg-white"><QRCode quietZone={0} value={id} size={200} logoImage="/favicon.svg" logoWidth={60} logoHeight={43} /></div>
      </div>
    </div>
  );
};

export default LaunchPad;
