/* eslint-disable react/prop-types */
import React, { Component } from "react";
import PropTypes from "prop-types";

import styles from "./Table.css";

import ExplicitSize from "metabase/components/ExplicitSize";
import Ellipsified from "metabase/components/Ellipsified";
import Icon from "metabase/components/Icon";
import MiniBar from "./MiniBar";

import ExternalLink from "metabase/core/components/ExternalLink";

import { formatValue } from "metabase/lib/formatting";
import {
  getTableCellClickedObject,
  getTableClickedObjectRowData,
  isColumnRightAligned,
} from "metabase/visualizations/lib/table";
import { getColumnExtent } from "metabase/visualizations/lib/utils";
import { HARD_ROW_LIMIT } from "metabase/lib/query";
import { isPositiveInteger } from "metabase/lib/number";

import { t } from "ttag";
import cx from "classnames";
import _ from "underscore";
import { getIn } from "icepick";

import { isID, isFK } from "metabase/lib/schema_metadata";

@ExplicitSize()
export default class TableSimple extends Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 0,
      pageSize: 1,
      sortColumn: null,
      sortDescending: false,
    };

    this.headerRef = React.createRef();
    this.footerRef = React.createRef();
    this.firstRowRef = React.createRef();
  }

  static propTypes = {
    data: PropTypes.object.isRequired,
  };

  static defaultProps = {
    className: "",
  };

  setSort(colIndex) {
    if (this.state.sortColumn === colIndex) {
      this.setState({ sortDescending: !this.state.sortDescending });
    } else {
      this.setState({ sortColumn: colIndex });
    }
  }

  componentDidUpdate() {
    const headerHeight = this.headerRef.current.getBoundingClientRect().height;
    const footerHeight = this.footerRef.current
      ? this.footerRef.current.getBoundingClientRect().height
      : 0;
    const rowHeight =
      this.firstRowRef.current.getBoundingClientRect().height + 1;
    const pageSize = Math.max(
      1,
      Math.floor((this.props.height - headerHeight - footerHeight) / rowHeight),
    );
    if (this.state.pageSize !== pageSize) {
      this.setState({ pageSize });
    }
  }

  visualizationIsClickable(clicked) {
    const { onVisualizationClick, visualizationIsClickable } = this.props;
    return (
      onVisualizationClick &&
      visualizationIsClickable &&
      visualizationIsClickable(clicked)
    );
  }

  render() {
    const {
      data,
      onVisualizationClick,
      isPivoted,
      settings,
      getColumnTitle,
      card,
      series,
    } = this.props;
    const { rows, cols } = data;
    const limit = getIn(card, ["dataset_query", "query", "limit"]) || undefined;
    const getCellBackgroundColor = settings["table._cell_background_getter"];

    const { page, pageSize, sortColumn, sortDescending } = this.state;

    const start = pageSize * page;
    const end = Math.min(rows.length - 1, pageSize * (page + 1) - 1);

    let rowIndexes = _.range(0, rows.length);
    if (sortColumn != null) {
      rowIndexes = _.sortBy(rowIndexes, rowIndex => {
        let value = rows[rowIndex][sortColumn];
        const col = cols[sortColumn];
        // for strings we should be case insensitive
        if (typeof value === "string") {
          if (isID(col) && isPositiveInteger(value)) {
            value = parseInt(value, 10);
          } else {
            value = value.toLowerCase();
          }
        }
        if (value === null) {
          value = undefined;
        }
        return value;
      });
      if (sortDescending) {
        rowIndexes.reverse();
      }
    }

    let paginateMessage;
    if (limit === undefined && rows.length >= HARD_ROW_LIMIT) {
      paginateMessage = t`Rows ${start + 1}-${end + 1} of first ${rows.length}`;
    } else {
      paginateMessage = t`Rows ${start + 1}-${end + 1} of ${rows.length}`;
    }

    return (
      <div className={cx(this.props.className, "relative flex flex-column")}>
        <div className="flex-full relative">
          <div
            className="absolute top bottom left right scroll-x scroll-show scroll-show--hover"
            style={{ overflowY: "hidden" }}
          >
            <table
              className={cx(
                styles.Table,
                styles.TableSimple,
                "fullscreen-normal-text",
                "fullscreen-night-text",
              )}
            >
              <thead ref={this.headerRef}>
                <tr>
                  {cols.map((col, colIndex) => (
                    <th
                      key={colIndex}
                      className={cx(
                        "TableInteractive-headerCellData cellData text-brand-hover text-medium",
                        {
                          "TableInteractive-headerCellData--sorted":
                            sortColumn === colIndex,
                          "text-right": isColumnRightAligned(col),
                        },
                      )}
                      onClick={() => this.setSort(colIndex)}
                    >
                      <div className="relative">
                        <Icon
                          name={sortDescending ? "chevrondown" : "chevronup"}
                          width={8}
                          height={8}
                          style={{
                            position: "absolute",
                            right: "100%",
                            marginRight: 3,
                          }}
                        />
                        <Ellipsified>{getColumnTitle(colIndex)}</Ellipsified>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowIndexes.slice(start, end + 1).map((rowIndex, index) => (
                  <tr
                    key={rowIndex}
                    ref={index === 0 ? this.firstRowRef : null}
                    data-testid="table-row"
                  >
                    {rows[rowIndex].map((value, columnIndex) => {
                      const clickedRowData = getTableClickedObjectRowData(
                        series,
                        rowIndex,
                        columnIndex,
                        isPivoted,
                        data,
                      );
                      const column = cols[columnIndex];
                      const clicked = getTableCellClickedObject(
                        data,
                        settings,
                        rowIndex,
                        columnIndex,
                        isPivoted,
                        clickedRowData,
                      );
                      const columnSettings = settings.column(column);

                      const extraData = this.props.getExtraDataForClick
                        ? this.props.getExtraDataForClick(clicked)
                        : {};

                      const cellData =
                        value == null ? (
                          "-"
                        ) : columnSettings["show_mini_bar"] ? (
                          <MiniBar
                            value={value}
                            options={columnSettings}
                            extent={getColumnExtent(cols, rows, columnIndex)}
                          />
                        ) : (
                          formatValue(value, {
                            ...columnSettings,
                            clicked: { ...clicked, extraData },
                            type: "cell",
                            jsx: true,
                            rich: true,
                          })
                        );

                      const isLink = cellData && cellData.type === ExternalLink;
                      const isClickable =
                        !isLink && this.visualizationIsClickable(clicked);

                      return (
                        <td
                          key={columnIndex}
                          style={{
                            whiteSpace: "nowrap",
                            backgroundColor:
                              getCellBackgroundColor &&
                              getCellBackgroundColor(
                                value,
                                rowIndex,
                                column.name,
                              ),
                          }}
                          className={cx(
                            "px1 border-bottom text-dark fullscreen-normal-text fullscreen-night-text text-bold",
                            {
                              "text-right": isColumnRightAligned(column),
                              "Table-ID": value != null && isID(column),
                              "Table-FK": value != null && isFK(column),
                              link: isClickable && isID(column),
                            },
                          )}
                        >
                          <span
                            className={cx("cellData inline-block", {
                              "cursor-pointer text-brand-hover": isClickable,
                            })}
                            onClick={
                              isClickable
                                ? e => {
                                    onVisualizationClick({
                                      ...clicked,
                                      element: e.currentTarget,
                                      extraData,
                                    });
                                  }
                                : undefined
                            }
                          >
                            {cellData}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {pageSize < rows.length ? (
          <div
            ref={this.footerRef}
            className="p1 flex flex-no-shrink flex-align-right fullscreen-normal-text fullscreen-night-text"
          >
            <span className="text-bold">{paginateMessage}</span>
            <span
              className={cx("text-brand-hover px1 cursor-pointer", {
                disabled: start === 0,
              })}
              onClick={() => this.setState({ page: page - 1 })}
            >
              <Icon name="triangle_left" size={10} />
            </span>
            <span
              className={cx("text-brand-hover pr1 cursor-pointer", {
                disabled: end + 1 >= rows.length,
              })}
              onClick={() => this.setState({ page: page + 1 })}
            >
              <Icon name="triangle_right" size={10} />
            </span>
          </div>
        ) : null}
      </div>
    );
  }
}
