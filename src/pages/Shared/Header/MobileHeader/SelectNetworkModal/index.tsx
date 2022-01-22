import { FC, MouseEventHandler } from "react";
import BaseModal from "../../../../../components/BaseModal";
import {
  LittleBSC,
  LittleETH,
  NetworkNow,
  PolygonIcon,
} from "../../../../../components/Icon";
import './styles'

type Props = {
  onClose?: MouseEventHandler<HTMLButtonElement>;
};

const SelectNetworkModal: FC<Props> = ({ ...props }) => {
  const classPrefix = "selectNetworkMobile";
  return (
    <BaseModal
      onClose={props.onClose}
      classNames={classPrefix}
      titleName={`Select a network`}
    >
      <ul>
        <li>
          <a href={"https://app.hedge.red"}>
            <LittleETH />
            <p>Ethereum</p>
          </a>
        </li>
        <li>
          <a href={"https://test.hedge.red"}>
            <LittleETH />
            <p>Rinkeby</p>
            <NetworkNow />
          </a>
        </li>
        <li>
          <a href={"https://bsc.hedge.red"}>
            <LittleBSC />
            <p>BSC</p>
          </a>
        </li>
        <li>
          <a href={"https://polygon.hedge.red"}>
            <PolygonIcon />
            <p>Polygon</p>
          </a>
        </li>
      </ul>
    </BaseModal>
  );
};

export default SelectNetworkModal;
