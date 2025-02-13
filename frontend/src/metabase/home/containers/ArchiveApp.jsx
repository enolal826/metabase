/* eslint-disable react/prop-types */
import React, { Component } from "react";
import { connect } from "react-redux";
import { t } from "ttag";

import ArchivedItem from "../../components/ArchivedItem";
import Button from "metabase/core/components/Button";
import BulkActionBar from "metabase/components/BulkActionBar";
import Card from "metabase/components/Card";
import PageHeading from "metabase/components/type/PageHeading";
import StackedCheckBox from "metabase/components/StackedCheckBox";
import VirtualizedList from "metabase/components/VirtualizedList";

import Search from "metabase/entities/search";
import listSelect from "metabase/hoc/ListSelect";

import { openNavbar } from "metabase/redux/app";
import { getUserIsAdmin } from "metabase/selectors/user";
import { isSmallScreen } from "metabase/lib/dom";

import {
  ArchiveBarContent,
  ArchiveBarText,
  ArchiveBody,
  ArchiveEmptyState,
  ArchiveHeader,
  ArchiveRoot,
} from "./ArchiveApp.styled";

const mapStateToProps = (state, props) => ({
  isAdmin: getUserIsAdmin(state, props),
});

const mapDispatchToProps = {
  openNavbar,
};

const ROW_HEIGHT = 68;

@Search.loadList({
  query: { archived: true },
  reload: true,
  wrapped: true,
})
@listSelect({ keyForItem: item => `${item.model}:${item.id}` })
@connect(mapStateToProps, mapDispatchToProps)
export default class ArchiveApp extends Component {
  componentDidMount() {
    if (!isSmallScreen()) {
      this.props.openNavbar();
    }
  }

  render() {
    const {
      isAdmin,
      list,
      reload,

      selected,
      selection,
      onToggleSelected,
    } = this.props;
    return (
      <ArchiveRoot>
        <ArchiveHeader>
          <PageHeading>{t`Archive`}</PageHeading>
        </ArchiveHeader>
        <ArchiveBody>
          <Card
            style={{
              height: list.length > 0 ? ROW_HEIGHT * list.length : "auto",
            }}
          >
            {list.length > 0 ? (
              <VirtualizedList
                items={list}
                rowHeight={ROW_HEIGHT}
                renderItem={({ item }) => (
                  <ArchivedItem
                    type={item.type}
                    name={item.getName()}
                    icon={item.getIcon().name}
                    color={item.getColor()}
                    isAdmin={isAdmin}
                    onUnarchive={
                      item.setArchived
                        ? async () => {
                            await item.setArchived(false);
                            reload();
                          }
                        : null
                    }
                    onDelete={
                      item.delete
                        ? async () => {
                            await item.delete();
                            reload();
                          }
                        : null
                    }
                    selected={selection.has(item)}
                    onToggleSelected={() => onToggleSelected(item)}
                    showSelect={selected.length > 0}
                  />
                )}
              />
            ) : (
              <ArchiveEmptyState>
                <h2>{t`Items you archive will appear here.`}</h2>
              </ArchiveEmptyState>
            )}
          </Card>
        </ArchiveBody>
        <BulkActionBar showing={selected.length > 0}>
          <ArchiveBarContent>
            <SelectionControls {...this.props} />
            <BulkActionControls {...this.props} />
            <ArchiveBarText>{t`${selected.length} items selected`}</ArchiveBarText>
          </ArchiveBarContent>
        </BulkActionBar>
      </ArchiveRoot>
    );
  }
}

const BulkActionControls = ({ selected, reload }) => (
  <span>
    <Button
      ml={1}
      medium
      onClick={async () => {
        try {
          await Promise.all(
            selected.map(item => item.setArchived && item.setArchived(false)),
          );
        } finally {
          reload();
        }
      }}
    >{t`Unarchive`}</Button>
    <Button
      ml={1}
      medium
      onClick={async () => {
        try {
          await Promise.all(selected.map(item => item.delete && item.delete()));
        } finally {
          reload();
        }
      }}
    >{t`Delete`}</Button>
  </span>
);

const SelectionControls = ({ deselected, onSelectAll, onSelectNone }) =>
  deselected.length === 0 ? (
    <StackedCheckBox checked={true} onChange={onSelectNone} />
  ) : (
    <StackedCheckBox checked={false} onChange={onSelectAll} />
  );
