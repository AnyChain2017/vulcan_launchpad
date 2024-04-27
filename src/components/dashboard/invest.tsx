import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import { TOKEN, IToken } from "@/types";
import TokenSelector from "./invest/tokenSelector";
import { Contract } from "ethers";
import { format } from "path";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useBalance } from "wagmi";
import useActiveWeb3 from "@/hooks/useActiveWeb3";
import { reduceAmount } from "@/utils";
import useToastr from "@/hooks/useToastr";
import { cyptoSIDAO } from '@/constants/config';

const tokens: TOKEN[] = [
  { label: "ETH", image: "/images/eth.webp" },
  { label: "USD", image: "/images/usd.png" },
]

interface IProps {
  visible: boolean,
  setVisible: React.Dispatch<React.SetStateAction<boolean>>,
  token: IToken,
  price: bigint,
  contract: Contract,
  ethPrice: number,
  refresh: (contract: Contract) => void,
  myInvestment: bigint,
  maxTokens: bigint
}

const Invest = ({ setVisible, token, price, contract, ethPrice, refresh, myInvestment, maxTokens }: IProps) => {

  const [fromAmount, setFromAmount] = React.useState<string>("0");
  const [showTokenSelector, setShowTokenSelector] = React.useState<boolean>(false);
  const [selectedToken, setSelectedToken] = React.useState<TOKEN>(tokens[0]);
  const [toAmount, setToAmount] = React.useState<bigint>(BigInt("0"));
  const [balance, setBalance] = React.useState<bigint>(BigInt("0"));
  const [ethAmount, setEthAmount] = React.useState<bigint>(BigInt("0"));
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { showToast } = useToastr ();

  const { address } = useActiveWeb3 ();
  const _balance = useBalance({ address });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (Number(value) < 0 || isNaN(Number(value)) || value.length > 20) {
      setFromAmount ("0");
      return;
    }
    setFromAmount(value);
  }

  const onInvest = async () => {
    if (isLoading) return;

    try {
      setIsLoading (true);
      if (ethAmount === BigInt("0") || fromAmount === "0" || fromAmount === "") throw "Input Amount to invest.";
      const _tokensFullyCharged = await contract.tokensFullyCharged ();
      if (!_tokensFullyCharged) throw "Tokens are not fully charged yet for this ICO.";
      const _minEthAvailable = await contract.minEthAvailable ();
      if (ethAmount <= _minEthAvailable) throw "Too small amount to purchase";
      // console.log(ethAmount, _balance.data?.value)
      if (_balance.data?.value && ethAmount >= _balance.data.value) throw "Insufficient ETH balance";

      console.log(ethAmount)
      const _tx = await contract.invest(ethAmount, cyptoSIDAO, { value: ethAmount, gasLimit: 500000 });
      await _tx.wait();
      showToast(`Successfully Invested ${formatEther(ethAmount)}ETH`, "success");
      refresh (contract); // refresh ICO data
      console.log({ _tx });
    } catch (err) {
      if (String(err).includes("User denied transaction signature")) {
        showToast ("User denied transaction signature", "warning");
      } else if (String(err).includes("user rejected transaction")) {
        showToast ("user rejected transaction", "warning");
      } else {
        showToast (String(err), "warning");
      }
      console.log(err);
    } finally {
      setIsLoading (false);
    }
  }

  const _fetchTokenAmountToPurchase = async () => {
    try {
      const _fromAmount = Number(fromAmount);
      if (isNaN(_fromAmount) || _fromAmount === 0 || isNaN(ethPrice) || ethPrice === 0) throw BigInt("0");
      const _amount = selectedToken.label === "ETH" ? parseEther(fromAmount) : parseEther(fromAmount) / BigInt(Math.ceil(ethPrice));
      setEthAmount (_amount);
      if (_amount === BigInt("0")) throw BigInt("0");
      // console.log(String(Number(_amount) / Number(price)));
      const _toAmount = await contract.tokensAvailableByEth (_amount);
      // console.log(String(_toAmount))
      throw _toAmount;
    } catch (err: any) {
      setToAmount(err as bigint);
    }
  }

  React.useEffect(() => {
    _fetchTokenAmountToPurchase ();  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAmount, selectedToken]);

  const fetchProjectData = async () => {
    try {
      const _balance = await contract.tokensAvailable();
      setBalance (_balance);
    } catch (err) {
      console.log(err)
    }
  }

  React.useEffect(() => {
    fetchProjectData ();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // @dev get max token amount that purchase available...
  const _getMaxTokens = async () => {
    const _fundsRaised = await contract.fundsRaised ();
    const _tokensAvailable = await contract.tokensAvailable ();
    const _value = BigInt(_tokensAvailable) * BigInt(token.price) / parseUnits("1", Number(token.decimal)) - BigInt(_fundsRaised);
    console.log({price: formatEther(token.price), ethAmount: formatEther(ethAmount), _tokensAvailable: formatEther(_tokensAvailable)});
    return _value;
  }

  // @dev set Max tokens
  const _setMaxTokens = async () => {
    const _max: bigint = await _getMaxTokens ();
    const _amount = selectedToken.label === "ETH" ? formatEther(_max) : formatEther(_max*BigInt(Math.ceil(ethPrice)));
    setFromAmount (_amount);
    console.log({ _max });
    console.log({ _amount });
    setEthAmount (_max);
  }

  // @dev set Max ETH
  const _setMaxEth = async () => {
    const _max = _balance.data?.value as bigint;
    const _amount = selectedToken.label === "ETH" ? formatEther(_max) : formatEther(_max*BigInt(Math.ceil(ethPrice)));
    setFromAmount (_amount);
    console.log({ _max });
    console.log({ _amount });
    setEthAmount (_max);
  }

  return (
    <div className="fixed top-0 right-0 left-0 bottom-0 z-50 bg-[#0000003a] backdrop-filter backdrop-blur-[5px] flex justify-center px-2 items-center">
      
      <div className="fixed top-0 left-0 right-0 bottom-0" onClick={() => {}}></div>
      <div className="rounded-xl p-[1px] pl-[2px] bg-gradient-to-tr from-[#ff6a0096] via-[#6d78b280] to-[#e02d6f86] mt-10 md:mt-0 w-full lg:w-[550px]">
        <div className="w-full h-full dark:bg-[#100E28] bg-white rounded-xl dark:text-white p-4 z-50">
          <div className="flex justify-end">
            <Icon onClick={() => setVisible(false)} icon="ep:close-bold" width={20} className="relative cursor-pointer hover:opacity-60"/>
          </div>
          <h2 className="flex gap-2 items-center"><Icon icon="solar:wallet-money-bold" width={30} height={30}/>BACK THIS PROJECT</h2>
          <div className="dark:bg-black bg-[#F3F7FC] rounded-xl mt-2 px-4 py-6 text-sm">
            <div className="flex justify-between items-end">
              <h1 className="px-3 pb-1">AMOUNT TO INVEST</h1>
              <button onClick={_setMaxEth} className="pb-[6px] px-3 pt-2 hover:opacity-60 cursor-pointer relative rounded-lg border dark:border-gray-700  text-xs">MAX</button>
            </div>
            <div className="relative bg-white dark:bg-[#100e2891] hover:bg-[#4b3b3b05] hover:dark:bg-black cursor-pointer border border-[#F3F7FC] dark:border-[#222832] mt-1 w-full py-3 px-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3" onClick={() => setShowTokenSelector (true)}>
                <Image
                  src={selectedToken.image}
                  width={40}
                  height={40}
                  alt={"sun"}
                  priority={true}      
                  className='rounded-full'
                />
                { selectedToken.label }
                <Icon icon="ep:arrow-down-bold" width={17} vFlip={showTokenSelector}/>
              </div>
              <div  className="grow pl-3">
                <input
                  onChange={handleAmountChange}
                  placeholder="0.0"
                  value={fromAmount}
                  className="bg-transparent py-4 text-[17px] w-full outline-none text-right border-none" 
                />
              </div>
              <TokenSelector setToken={setSelectedToken} visible={showTokenSelector} setVisible={setShowTokenSelector} tokens={tokens}/>
            </div>
            <div className="flex justify-between px-2 mt-1">
              <div className="px-1 dark:text-gray-400">Balance: {_balance.isSuccess ? reduceAmount(_balance.data?.formatted) : 0}ETH (${ _balance.isSuccess && reduceAmount(Number(_balance.data.formatted)*ethPrice) })</div>
              <div className="px-1 dark:text-gray-400">= {reduceAmount(formatEther(ethAmount))} ETH</div>
            </div>

            <div className="flex justify-between items-end mt-8">
              <h1 className="px-3 pb-1">TOKEN AMOUNT</h1>
              <button onClick={_setMaxTokens} className="pb-[6px] px-3 pt-2 hover:opacity-60 cursor-pointer relative rounded-lg border dark:border-gray-700  text-xs">MAX</button>
            </div>
            <div className="relative mt-1 bg-white dark:bg-[#100e2891] hover:bg-[#4b3b3b05] hover:dark:bg-black cursor-pointer border border-[#F3F7FC] dark:border-[#222832] w-full py-3 px-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="simple-icons:webmoney" width={35} height={35} className="ml-1" />
                {token.symbol}
              </div>
              <div  className="grow pl-3">
                <input
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
                  disabled={true}
                  placeholder="0.0"
                  value={String(toAmount)}
                  className="bg-transparent py-4 text-[17px] w-full outline-none text-right border-none" 
                />
              </div>
            </div>
            <div className="flex justify-between px-2 mt-1">
              <div className="px-1 dark:text-gray-400">
                Available: { reduceAmount(formatUnits(maxTokens, Number(token.decimal))) } 
              </div>
            </div>
            <div className="px-3 dark:text-gray-400">
              (*{reduceAmount(formatEther(price))}ETH = { token.decimal >= BigInt("0") && reduceAmount(Number(formatEther(price)) * Number(formatUnits(maxTokens, Number(token.decimal)))) }ETH )
            </div>
          </div>
          <h3 className="px-3 mt-2 text-[15px]">
            <span className="text-gray-700 dark:text-gray-400 font-semibold text-[15px]">My Investment</span>: { reduceAmount(formatEther(myInvestment)) }ETH (= { price > BigInt("0") && reduceAmount(myInvestment / price) } tokens) 
          </h3>
          <button onClick={onInvest} className="flex relative cursor-pointer justify-center items-center gap-2 text-white mt-7 p-4 w-full rounded-xl bg-gradient-to-r from-[#FF6802] to-[#EE0E72] hover:from-[#ff6702de] hover:to-[#ee0e739f]">
            {
              isLoading ?
              <>
                <Icon icon="eos-icons:bubble-loading" width={30} height={30}/> PROCESSING...
              </> :
              <>
                <Icon icon="icons8:buy" width={30} height={30}/> INVEST
              </>
            }
          </button>
          
        </div>
      </div>
    </div>
  );
};

export default Invest;
