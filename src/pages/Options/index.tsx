import { t, Trans } from "@lingui/macro";
import { BigNumber, Contract } from "ethers";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import ChooseType from "../../components/ChooseType";
import { PutDownIcon, WhiteLoading } from "../../components/Icon";
import InfoShow from "../../components/InfoShow";
import MainButton from "../../components/MainButton";
import MainCard from "../../components/MainCard";
import { DoubleTokenShow, SingleTokenShow } from "../../components/TokenShow";
import {
  FortEuropeanOptionContract,
  tokenList,
  TokenType,
} from "../../libs/constants/addresses";
import {
  ERC20Contract,
  FortEuropeanOption,
  NestPriceContract,
} from "../../libs/hooks/useContract";
import useWeb3 from "../../libs/hooks/useWeb3";
import {
  BASE_2000ETH_AMOUNT,
  BASE_AMOUNT,
  bigNumberToNormal,
  checkWidth,
  formatInputNum,
  normalToBigNumber
} from "../../libs/utils";
import { DatePicker, message, Tooltip } from "antd";
import "../../styles/ant.css";
import "./styles";
import { HoldLine } from "../../components/HoldLine";
import moment from "moment";
import { useFortEuropeanOptionOpen } from "../../contracts/hooks/useFortEuropeanOptionTransation";
import OptionsList from "../../components/OptionsList";
import useTransactionListCon from "../../libs/hooks/useTransactionInfo";
import { Popup } from "reactjs-popup";
import OptionsNoticeModal from "./OptionsNoticeModal";

export type OptionsListType = {
  index: BigNumber;
  tokenAddress: string;
  strikePrice: BigNumber;
  orientation: boolean;
  exerciseBlock: BigNumber;
  balance: BigNumber;
  owner: string;
};

const MintOptions: FC = () => {
  const classPrefix = "options-mintOptions";
  const { account, chainId, library } = useWeb3();
  const [showNotice, setShowNotice] = useState(false);
  const modal = useRef<any>();
  const nestPriceContract = NestPriceContract();
  const fortEuropeanOption = FortEuropeanOption(FortEuropeanOptionContract);
  const fortContract = ERC20Contract(tokenList["DCU"].addresses);
  const { pendingList, txList } = useTransactionListCon();
  const [isRefresh, setIsRefresh] = useState<boolean>(false);
  const [latestBlock, setLatestBlock] = useState({ time: 0, blockNum: 0 });
  const intervalRef = useRef<NodeJS.Timeout>();
  const [isLong, setIsLong] = useState(true);
  const [exercise, setExercise] = useState({ time: "", blockNum: 0 });
  const [fortNum, setFortNum] = useState("");
  const [strikePrice, setStrikePrice] = useState<string>("");
  const [tokenPair, setTokenPair] = useState<TokenType>(tokenList["ETH"]);
  const [optionsListState, setOptionsListState] = useState<
    Array<OptionsListType>
  >([]);
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const [priceNow, setPriceNow] = useState<{ [key: string]: TokenType }>();
  const [fortBalance, setFortBalance] = useState(BigNumber.from(0));
  const [optionTokenValue, setOptionTokenValue] = useState<BigNumber>();

  const showNoticeModal = () => {
    var cache = localStorage.getItem("OptionsFirst");
    if (cache !== "1") {
      setShowNotice(true);
      return true;
    }
    return false;
  };

  const trList = optionsListState.map((item) => {
    return (
      <OptionsList
        className={classPrefix}
        key={item.index.toString() + account}
        item={item}
        blockNum={latestBlock.blockNum.toString()}
        nowPrice={priceNow}
      />
    );
  });

  const getOptionsList = useCallback(async () => {
    if (!fortEuropeanOption) {
      return;
    }
    const optionsCount = await fortEuropeanOption.getOptionCount();
    const optionsList = await fortEuropeanOption.find(
      0,
      1000,
      optionsCount,
      account
    );
    const resultList = optionsList.filter((item: OptionsListType) =>
      item.balance.gt(BigNumber.from("0"))
    );
    setOptionsListState(resultList);
    setIsRefresh(true);
  }, [account, fortEuropeanOption]);

  useEffect(() => {
    setStrikePrice("");
    setFortNum("");
  }, [account]);

  useEffect(() => {
    if (!isRefresh) {
      getOptionsList();
    }
    if (!txList || txList.length === 0) {
      return;
    }
    const latestTx = txList[txList.length - 1];
    if (
      latestTx.txState === 1 &&
      (latestTx.type === 2 || latestTx.type === 3 || latestTx.type === 8)
    ) {
      setTimeout(getOptionsList, 4000);
      setTimeout(() => {
        if (!fortContract) {
          return;
        }
        fortContract.balanceOf(account).then((value: any) => {
          setFortBalance(BigNumber.from(value));
        });
      }, 4000);
    }
  }, [account, fortContract, getOptionsList, isRefresh, txList]);

  const loadingButton = () => {
    const latestTx = pendingList.filter((item) => item.type === 2);
    return latestTx.length > 0 ? true : false;
  };
  useEffect(() => {
    if (fortContract) {
      fortContract.balanceOf(account).then((value: any) => {
        setFortBalance(BigNumber.from(value));
      });
      return;
    }
    setFortBalance(BigNumber.from(0));
  }, [account, fortContract]);

  const getPrice = async (contract: Contract, chainId: number) => {
    const price_ETH = await contract.lastPriceList(
      0,
      tokenList["ETH"].pairIndex[chainId],
      1
    );
    const priceValue_ETH = BASE_2000ETH_AMOUNT.mul(BASE_AMOUNT).div(
      price_ETH[1]
    );
    const price_BTC = await contract.lastPriceList(
      0,
      tokenList["BTC"].pairIndex[chainId],
      1
    );
    const priceValue_BTC = BASE_2000ETH_AMOUNT.mul(BASE_AMOUNT).div(
      price_BTC[1]
    );
    const tokenListNew = tokenList;
    tokenListNew["ETH"].nowPrice = priceValue_ETH;
    tokenListNew["BTC"].nowPrice = priceValue_BTC;
    setPriceNow(tokenListNew);
  };
  useEffect(() => {
    if (!nestPriceContract || !chainId) {
      return;
    }
    getPrice(nestPriceContract, chainId);
    const id = setInterval(() => {
      getPrice(nestPriceContract, chainId);
    }, 60 * 1000);
    intervalRef.current = id;
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [chainId, nestPriceContract]);

  useEffect(() => {
    if (moment().valueOf() - latestBlock.time > 6000 && library) {
      (async () => {
        const latest = await library?.getBlockNumber();
        setLatestBlock({ time: moment().valueOf(), blockNum: latest || 0 });
      })();
    }
  }, [latestBlock.time, library]);

  const handleType = (isLong: boolean) => {
    setIsLong(isLong);
  };

  const onOk = useCallback(
    async (value: any) => {
      if (latestBlock.blockNum === 0) {
        return;
      }

      const nowTime = moment().valueOf();
      const selectTime = moment(value).valueOf();
      if (selectTime > nowTime) {
        const timeString = moment(value).format("YYYY[-]MM[-]DD");
        const blockNum = parseFloat(
          ((selectTime - nowTime) / 3000).toString()
        ).toFixed(0);
        setExercise({
          time: timeString,
          blockNum: Number(blockNum) + (latestBlock.blockNum || 0),
        });
      } else {
        const timeString = moment().format("YYYY[-]MM[-]DD");
        setExercise({ time: timeString, blockNum: latestBlock.blockNum || 0 });
      }
    },
    [latestBlock]
  );

  useEffect(() => {
    if (
      fortEuropeanOption &&
      strikePrice !== "" &&
      fortNum !== "" &&
      priceNow &&
      exercise.blockNum !== 0 && chainId
    ) {
      (async () => {
        setShowLoading(true);
        try {
          const value = await fortEuropeanOption.estimate(
            tokenPair.addresses[chainId],
            priceNow[tokenPair.symbol].nowPrice,
            normalToBigNumber(
              strikePrice,
              tokenList["USDT"].decimals
            ).toString(),
            isLong,
            exercise.blockNum.toString(),
            normalToBigNumber(fortNum).toString()
          );
          setOptionTokenValue(BigNumber.from(value));
        } catch {
          setOptionTokenValue(undefined);
        }
        setShowLoading(false);
      })();
    } else {
      setOptionTokenValue(undefined);
    }
  }, [chainId, exercise.blockNum, fortEuropeanOption, fortNum, isLong, priceNow, strikePrice, tokenPair.addresses, tokenPair.symbol]);

  const checkButton = () => {
    if (
      fortNum === "" ||
      strikePrice === "" ||
      exercise.blockNum === 0 ||
      normalToBigNumber(fortNum).gt(fortBalance) ||
      normalToBigNumber(strikePrice || "0", tokenList["USDT"].decimals).eq(
        BigNumber.from("0")
      ) ||
      loadingButton()
    ) {
      return true;
    }
    return false;
  };
  function disabledDate(current: any) {
    return current && current < moment().add(30, "days").startOf("day");
  }
  const active = useFortEuropeanOptionOpen(
    tokenPair,
    isLong,
    BigNumber.from(exercise.blockNum),
    normalToBigNumber(fortNum),
    strikePrice ? normalToBigNumber(strikePrice, 18) : undefined
  );

  const priceString = () => {
    return priceNow
      ? priceNow[tokenPair.symbol].nowPrice
        ? bigNumberToNormal(priceNow[tokenPair.symbol].nowPrice!, 18, 2)
        : "---"
      : "---";
  };
  return (
    <div>
      {showNotice ? (
        <Popup
          ref={modal}
          open
          onClose={() => {
            setShowNotice(false);
          }}
        >
          <OptionsNoticeModal
            onClose={() => modal.current.close()}
            action={active}
          ></OptionsNoticeModal>
        </Popup>
      ) : null}
      <div className={classPrefix}>
        <MainCard classNames={`${classPrefix}-leftCard`}>
          <InfoShow
            topLeftText={t`Token pair`}
            bottomRightText={""}
            tokenSelect={true}
            tokenList={[tokenList["ETH"], tokenList["BTC"]]}
            showUSDT={true}
            getSelectedToken={setTokenPair}
          >
            <div className={`${classPrefix}-leftCard-tokenPair`}>
              <DoubleTokenShow
                tokenNameOne={tokenPair.symbol}
                tokenNameTwo={"USDT"}
              />
              <PutDownIcon />
            </div>
            <p>{`${
              checkWidth() ? "1 " + tokenPair.symbol + " = " : ""
            }${priceString()} USDT`}</p>
          </InfoShow>
          <ChooseType
            callBack={handleType}
            isLong={isLong}
            textArray={[t`Call`, t`Put`]}
          />
          <InfoShow
            topLeftText={t`Exercise time`}
            bottomRightText={`${t`Block number`}: ${
              exercise.blockNum === 0 ? "---" : exercise.blockNum
            }`}
          >
            <DatePicker
              format="YYYY-MM-DD"
              disabledDate={disabledDate}
              onChange={onOk}
              bordered={false}
              suffixIcon={<PutDownIcon />}
              placeholder={"Select"}
              allowClear={false}
            />
          </InfoShow>

          <InfoShow
            topLeftText={t`Strike price`}
            bottomRightText={`1 ETH = ${priceString()} USDT`}
          >
            <input
              type="text"
              placeholder={t`Input`}
              className={"input-left"}
              value={strikePrice}
              maxLength={32}
              onChange={(e) => setStrikePrice(formatInputNum(e.target.value))}
            />
            <span>USDT</span>
          </InfoShow>
          <InfoShow
            topLeftText={t`Payment`}
            bottomRightText={`${t`Balance`}: ${bigNumberToNormal(
              fortBalance,
              18,
              6
            )} DCU`}
            balanceRed={
              normalToBigNumber(fortNum).gt(fortBalance) ? true : false
            }
          >
            <SingleTokenShow tokenNameOne={"DCU"} isBold />
            <input
              type="text"
              placeholder={t`Input`}
              className={"input-middle"}
              value={fortNum}
              maxLength={32}
              onChange={(e) => setFortNum(formatInputNum(e.target.value))}
            />
            <button
              className={"max-button"}
              onClick={() => setFortNum(bigNumberToNormal(fortBalance, 18, 18))}
            >
              MAX
            </button>
          </InfoShow>
        </MainCard>

        <MainCard classNames={`${classPrefix}-rightCard`}>
          <p className={`${classPrefix}-rightCard-tokenTitle`}>
            <Tooltip
              placement="top"
              color={"#ffffff"}
              title={t`One option shares to the return of a ETH.`}
            >
              <span>
                <Trans>Option shares</Trans>
              </span>
            </Tooltip>
          </p>
          {showLoading ? (
            <WhiteLoading className={"animation-spin"} />
          ) : (
            <p className={`${classPrefix}-rightCard-tokenValue`}>
              {optionTokenValue
                ? bigNumberToNormal(optionTokenValue, 18, 6)
                : "---"}
            </p>
          )}

          <MainButton
            disable={checkButton()}
            loading={loadingButton()}
            onClick={() => {
              if (normalToBigNumber(fortNum).gt(fortBalance)) {
                message.error(t`Insufficient balance`);
                return;
              }
              if (checkButton()) {
                return;
              }
              if (showNoticeModal()) {
                return;
              }
              active();
            }}
          >
            <Trans>Buy Option</Trans>
          </MainButton>
          <div className={`${classPrefix}-rightCard-time`}>
            <p className={`${classPrefix}-rightCard-timeTitle`}>
              {` ${exercise.time}`}
            </p>
            <p className={`${classPrefix}-rightCard-timeValue`}>
              <Trans>compare with spot price and strike price</Trans>
            </p>
          </div>

          <div className={`${classPrefix}-rightCard-smallCard`}>
            <MainCard>
              <div className={`${classPrefix}-rightCard-smallCard-title`}>
                <p>
                  <Trans>Spot price</Trans>
                  {isLong ? " > " : " < "}
                  {bigNumberToNormal(
                    normalToBigNumber(strikePrice || "0"),
                    18,
                    6
                  )}
                </p>
                <p>
                  <Trans>Expected get</Trans>
                </p>
              </div>
              <p className={`${classPrefix}-rightCard-smallCard-value`}>
                {isLong
                  ? t`(Spot price - Strike price)*`
                  : t`(Strike price - Spot price)*`}
                {optionTokenValue
                  ? bigNumberToNormal(optionTokenValue, 18, 6)
                  : "---"}
              </p>
              <p className={`${classPrefix}-rightCard-smallCard-name`}>DCU</p>
            </MainCard>
            <MainCard>
              <div className={`${classPrefix}-rightCard-smallCard-title`}>
                <p>
                  <Trans>Spot price</Trans>
                  {isLong ? " <= " : " >= "}
                  {bigNumberToNormal(
                    normalToBigNumber(strikePrice || "0"),
                    18,
                    6
                  )}
                </p>
                <p>
                  <Trans>Expected get</Trans>
                </p>
              </div>
              <p className={`${classPrefix}-rightCard-smallCard-value`}>
                {"0"}
              </p>
              <p className={`${classPrefix}-rightCard-smallCard-name`}>DCU</p>
            </MainCard>
          </div>
        </MainCard>
      </div>
      {optionsListState.length > 0 ? (
        <div>
          <HoldLine>
            <Trans>Position</Trans>
          </HoldLine>
          {checkWidth() ? (
            <table>
              <thead>
                <tr className={`${classPrefix}-table-title`}>
                  <th>
                    <Trans>Token pair</Trans>
                  </th>
                  <th>
                    <Trans>Type</Trans>
                  </th>
                  <th>
                    <Trans>Strike price</Trans>
                  </th>
                  <th className={`exerciseTime`}>
                    <Trans>Exercise time</Trans>
                  </th>
                  <th>
                    <Trans>Option shares</Trans>
                  </th>
                  <th>
                    <Trans>Sale earn</Trans>
                  </th>
                  <th>
                    <Trans>Strike earn</Trans>
                  </th>
                  <th>
                    <Trans>Operate</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>{trList}</tbody>
            </table>
          ) : (
            <ul>{trList}</ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default MintOptions;
