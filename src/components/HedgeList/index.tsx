import BigNumber from 'bignumber.js'
import { t, Trans } from "@lingui/macro";
import { FC, useCallback, useEffect, useState } from "react";
import {
  tokenList,
  TokenType,
} from "../../libs/constants/addresses";
import {
  NestPriceContract,
} from "../../libs/hooks/useContract";
import useTransactionListCon, {
  TransactionType,
} from "../../libs/hooks/useTransactionInfo";
import useWeb3 from "../../libs/hooks/useWeb3";
import {
  BASE_2000ETH_AMOUNT, BASE_AMOUNT,
  bigNumberToNormal,
  checkWidth,
  ZERO_ADDRESS,
} from "../../libs/utils";
import MainButton from "../MainButton";
import MainCard from "../MainCard";
import './styles'
import {HedgeListType} from "../../pages/Hedge";
import useHedgeExercise from "../../contracts/hooks/useHedgeExercise";
import {formatNumber, parseToBigNumber} from "../../libs/bignumberUtil";
import MobileListInfo from "./MobileListInfo";

type Props = {
  item: HedgeListType;
  key: string;
  className: string;
  blockNum: string;
  nowPrice?: {[key: string]: TokenType};
};

const HedgeList: FC<Props> = ({ ...props }) => {
  const { pendingList } = useTransactionListCon();
  const priceContract = NestPriceContract();
  const [strikeAmount, setStrikeAmount] = useState<BigNumber>();
  const [tokenX, setTokenX] = useState("ETH")
  const loadingButton = () => {
    const exerciseTx = pendingList.filter(
      (item) =>
        item.info === props.item.index.toString() &&
        item.type === TransactionType.strikeHedge
    );
    return exerciseTx.length > 0;
  };
  
  useEffect(()=>{
    if (props.item.tokenIndex === 0) {
      setTokenX("ETH")
    } else if (props.item.tokenIndex === 1) {
      setTokenX("BTC")
    }
  }, [props.item.tokenIndex])
  
  const TokenOneSvg = tokenList[tokenX].Icon;
  const TokenTwoSvg = tokenList["USDT"].Icon;
  const active = useHedgeExercise(props.item.index.toNumber());
  
  const getPrice = useCallback(async () => {
    if (priceContract) {
      const price = await priceContract.lastPriceList(
        0,
        props.item.tokenIndex,
        1
      );
      const price_USDT = BASE_2000ETH_AMOUNT.mul(BASE_AMOUNT).div(
        price[1]
      );
      const exercisePrice = parseToBigNumber(price_USDT).multipliedBy(parseToBigNumber(props.item.y0))
        .shiftedBy(-18).plus(parseToBigNumber(props.item.x0)).multipliedBy(2).minus(
          (parseToBigNumber(props.item.x0).multipliedBy(parseToBigNumber(props.item.y0))
            .shiftedBy(-18)).sqrt()
        )
    
      setStrikeAmount(exercisePrice)
    }
  }, [priceContract, props.item])
  
  useEffect(()=>{
    getPrice()
  }, [getPrice])
  
  const checkButton = () => {
    return loadingButton();
  };

  const classPrefix = "HedgeList";
  const liItem = (
    <li className={`${classPrefix}-mobile`}>
      <MainCard classNames={`${classPrefix}-mobile-card`}>
        <div className={`${classPrefix}-mobile-card-top`}>
          <MobileListInfo title={t`LP pair`}>
            <div>
              <TokenOneSvg />
              <TokenTwoSvg />
            </div>
          </MobileListInfo>
        </div>
        <div className={`${classPrefix}-mobile-card-mid`}>
          <MobileListInfo title={t`Liquidity`}>
            <p>{bigNumberToNormal(props.item.x0, 18, 2)} USDT / {bigNumberToNormal(props.item.y0, 18, 2)} ETH</p>
          </MobileListInfo>
        </div>
        <div className={`${classPrefix}-mobile-card-bottom`}>
          <MobileListInfo title={t`Strike earn`}>
            <p>
              {strikeAmount ? formatNumber(strikeAmount.shiftedBy(-18), 2) : "---"}{" "}
              DCU
            </p>
          </MobileListInfo>
        </div>
        <div className={`${classPrefix}-mobile-card-buttonGroup`}>
          <MainButton
            onClick={() => {
              return checkButton() ? null : active();
            }}
            loading={loadingButton()}
            disable={checkButton()}
          >
            <Trans>Strike</Trans>
          </MainButton>
        </div>
      </MainCard>
    </li>
  );

  return checkWidth() ? (
    <tr key={props.key} className={`${props.className}-table-normal`}>
      <td className={"tokenPair"}>
        <TokenOneSvg />
        <TokenTwoSvg />
      </td>
      <td>{bigNumberToNormal(props.item.x0, 18, 2)} USDT/ {bigNumberToNormal(props.item.y0, 18, 2)} ETH</td>
      <td>{strikeAmount ? formatNumber(strikeAmount.shiftedBy(-18), 2) : "---"}</td>
      <td className={"buttonGroup"}>
        <div>
          <MainButton
            onClick={() => {
              return checkButton() ? null : active();
            }}
            loading={loadingButton()}
            disable={checkButton()}
          >
            <Trans>Strike</Trans>
          </MainButton>
        </div>
      </td>
    </tr>
  ) : (liItem);
};

export default HedgeList;
