import React from 'react';
import { Layout, Row, Col, Card, Statistic, Table } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  SettingOutlined,
  WarningOutlined
} from '@ant-design/icons';
import ReactCountryFlag from 'react-country-flag';

import './MainWindow.css';
import logo from './assets/images/logo.png';

const { Header, Content } = Layout;
const { Column } = Table;

class MainWindow extends React.Component {
  state = {
    // Header
    name: 'IkaGo Web',
    version: '',
    // Overall
    active: false,
    time: 0,
    outbound: 0,
    outboundTotal: 0,
    outboundShowTotal: false,
    inbound: 0,
    inboundTotal: 0,
    inboundShowTotal: false,
    // Nodes
    local: [],
    remote: []
  };

  updateData = () => {
    const init = {
      method: 'GET'
    };
    return fetch('http://localhost:18080', init)
      .then((res) => res.json())
      .then((res) => {
        // Overall
        let outboundTotal = 0;
        for (let src in res.monitor.local.out) {
          outboundTotal = outboundTotal + res.monitor.local.out[src].size;
        }
        let outbound = 0;
        if (this.state.outboundTotal !== 0) {
          outbound = outboundTotal - this.state.outboundTotal;
        }

        let inboundTotal = 0;
        for (let src in res.monitor.local.in) {
          inboundTotal = inboundTotal + res.monitor.local.in[src].size;
        }
        let inbound = 0;
        if (this.state.inboundTotal !== 0) {
          inbound = inboundTotal - this.state.inboundTotal;
        }

        // Nodes
        let localNodes = [];
        for (let node in res.monitor.local.out) {
          if (localNodes.find((ele) => ele === node) === undefined) {
            localNodes.push(node);
          }
        }
        for (let node in res.monitor.local.in) {
          if (localNodes.find((ele) => ele === node) === undefined) {
            localNodes.push(node);
          }
        }
        let local = [];
        for (let node in localNodes) {
          local.push(
            this.convertNode(
              this.state.local.find((ele) => ele.key === localNodes[node]),
              localNodes[node],
              res.monitor.local.out[localNodes[node]],
              res.monitor.local.in[localNodes[node]]
            )
          );
        }
        local.sort((first, second) => {
          return second.lastSeen - first.lastSeen;
        });

        let remoteNodes = [];
        for (let node in res.monitor.remote.out) {
          if (remoteNodes.find((ele) => ele === node) === undefined) {
            remoteNodes.push(node);
          }
        }
        for (let node in res.monitor.remote.in) {
          if (remoteNodes.find((ele) => ele === node) === undefined) {
            remoteNodes.push(node);
          }
        }
        let remote = [];
        for (let node in remoteNodes) {
          remote.push(
            this.convertNode(
              this.state.remote.find((ele) => ele.key === remoteNodes[node]),
              remoteNodes[node],
              res.monitor.remote.out[remoteNodes[node]],
              res.monitor.remote.in[remoteNodes[node]]
            )
          );
        }
        remote.sort((first, second) => {
          return second.lastSeen - first.lastSeen;
        });

        this.setState({
          name: res.name,
          version: res.version,
          active: true,
          time: res.time,
          outbound: outbound,
          outboundTotal: outboundTotal,
          inbound: inbound,
          inboundTotal: inboundTotal,
          local: local,
          remote: remote
        });
      })
      .catch((e) => {
        console.error(e);
        this.setState({
          name: 'IkaGo Web',
          version: '',
          active: false,
          time: 0,
          outbound: 0,
          outboundTotal: 0,
          inbound: 0,
          inboundTotal: 0,
          local: [],
          remote: []
        });
      });
  };

  convertTime = (time) => {
    time = time.toFixed(0);
    const hour = Math.floor(time / 3600);
    const min = Math.floor((time - 3600 * hour) / 60);
    const second = time - 3600 * hour - 60 * min;
    if (hour !== 0) {
      return hour + ':' + ('0' + min).substr(-2) + ':' + ('0' + second).substr(-2);
    } else {
      return ('0' + min).substr(-2) + ':' + ('0' + second).substr(-2);
    }
  };

  convertSize = (size) => {
    if (size > 1024 * 1024 * 1024) {
      return size / (1024 * 1024 * 1024);
    } else if (size > 1024 * 1024) {
      return size / (1024 * 1024);
    } else if (size > 1024) {
      return size / 1024;
    } else {
      return size;
    }
  };

  mapSizeUnit = (size) => {
    if (size > 1024 * 1024 * 1024) {
      return 'GB';
    } else if (size > 1024 * 1024) {
      return 'MB';
    } else if (size > 1024) {
      return 'kB';
    } else {
      return 'B';
    }
  };

  convertNode = (stateNode, key, outValue, inValue) => {
    if (stateNode !== undefined) {
      return {
        key: key,
        outbound: outValue !== undefined ? outValue.size : 0 - stateNode.outboundTotal,
        outboundTotal: outValue !== undefined ? outValue.size : 0,
        inbound: inValue !== undefined ? inValue.size - stateNode.inboundTotal : 0,
        inboundTotal: inValue !== undefined ? inValue.size : 0,
        lastSeen: Math.max(outValue !== undefined ? outValue.lastSeen : 0, inValue !== undefined ? inValue.lastSeen : 0)
      };
    } else {
      return {
        key: key,
        outbound: 0,
        outboundTotal: outValue !== undefined ? outValue.size : 0,
        inbound: 0,
        inboundTotal: inValue !== undefined ? inValue.size : 0,
        lastSeen: Math.max(outValue !== undefined ? outValue.lastSeen : 0, inValue !== undefined ? inValue.lastSeen : 0)
      };
    }
  };

  lookup = (ip) => {
    if (this.countryMap.has(ip)) {
      const countryCode = this.countryMap.get(ip);
      if (typeof countryCode === 'number' && isFinite(countryCode)) {
        if (countryCode > 0) {
          this.countryMap.set(ip, countryCode - 1);
          return undefined;
        }
      } else {
        return countryCode;
      }
    }
    this.countryMap.set(ip, 15);

    const init = {
      method: 'GET'
    };
    fetch('http://ip-api.com/json/' + ip + '.1', init)
      .then((res) => res.json())
      .then((res) => {
        this.countryMap.set(ip, res.countryCode);
      })
      .catch(() => {});

    return undefined;
  };

  showIP = (text) => {
    const partialIP = text.key.substr(0, text.key.lastIndexOf('.'));
    const countryCode = this.lookup(partialIP);
    if (countryCode === undefined) {
      return text.key;
    }
    return (
      <span>
        <ReactCountryFlag countryCode={countryCode} svg /> {text.key}
      </span>
    );
  };

  showOutbound = (text) => {
    if (this.state.outboundShowTotal) {
      return (
        (Math.floor(this.convertSize(text.outboundTotal) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.outboundTotal)
      );
    } else {
      return (
        (Math.floor(this.convertSize(text.outbound) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.outbound) +
        '/s'
      );
    }
  };

  showInbound = (text) => {
    if (this.state.inboundShowTotal) {
      return (
        (Math.floor(this.convertSize(text.inboundTotal) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.inboundTotal)
      );
    } else {
      return (
        (Math.floor(this.convertSize(text.inbound) * 10) / 10).toFixed(1) + ' ' + this.mapSizeUnit(text.inbound) + '/s'
      );
    }
  };

  render() {
    return (
      <Layout>
        <Header className="header">
          <img className="header-icon" src={logo} alt="icon" />
          <p className="header-title">{this.state.name}</p>
          <p className="header-subtitle">{this.state.version}</p>
        </Header>
        <Content className="content">
          <Row gutter={16}>
            <Col className="content-col" md={6} lg={4}>
              <Card className="content-card" hoverable>
                <Statistic
                  prefix={(() => {
                    if (this.state.active) {
                      return <CheckOutlined />;
                    } else {
                      return <WarningOutlined />;
                    }
                  })()}
                  title="Status"
                  value={(() => {
                    if (this.state.active) {
                      return 'Active';
                    } else {
                      return 'Inactive';
                    }
                  })()}
                  valueStyle={{
                    color: (() => {
                      if (this.state.active) {
                        return '#000';
                      } else {
                        return '#cf1322';
                      }
                    })()
                  }}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card className="content-card" hoverable>
                <Statistic
                  precision={2}
                  prefix={<ClockCircleOutlined />}
                  title="Operation Time"
                  value={this.convertTime(this.state.time)}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card
                hoverable
                onClick={() => {
                  this.setState({
                    outboundShowTotal: !this.state.outboundShowTotal
                  });
                }}
              >
                <Statistic
                  precision={1}
                  prefix={<ArrowUpOutlined />}
                  suffix={(() => {
                    if (this.state.outboundShowTotal) {
                      return this.mapSizeUnit(this.state.outboundTotal);
                    } else {
                      return this.mapSizeUnit(this.state.outbound) + '/s';
                    }
                  })()}
                  title="Outbound"
                  value={(() => {
                    if (this.state.outboundShowTotal) {
                      return this.convertSize(this.state.outboundTotal);
                    } else {
                      return this.convertSize(this.state.outbound);
                    }
                  })()}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card
                hoverable
                onClick={() => {
                  this.setState({
                    inboundShowTotal: !this.state.inboundShowTotal
                  });
                }}
              >
                <Statistic
                  precision={1}
                  prefix={<ArrowDownOutlined />}
                  suffix={(() => {
                    if (this.state.inboundShowTotal) {
                      return this.mapSizeUnit(this.state.inboundTotal);
                    } else {
                      return this.mapSizeUnit(this.state.inbound) + '/s';
                    }
                  })()}
                  title="Inbound"
                  value={(() => {
                    if (this.state.inboundShowTotal) {
                      return this.convertSize(this.state.inboundTotal);
                    } else {
                      return this.convertSize(this.state.inbound);
                    }
                  })()}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card className="content-card">
                <Statistic
                  prefix={<SettingOutlined />}
                  title="Configure"
                  value=":18080"
                  valueStyle={{ color: '#00000073' }}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col className="content-col-table" span={12}>
              <Table dataSource={this.state.local} pagination={false} size="middle">
                <Column title="Source" key="source" align="left" render={this.showIP} />
                <Column title="Outbound" key="outbound" align="center" render={this.showOutbound} width={200} />
                <Column title="Inbound" key="inbound" align="center" render={this.showInbound} width={200} />
              </Table>
            </Col>
            <Col className="content-col-table" span={12}>
              <Table dataSource={this.state.remote} pagination={false} size="middle">
                <Column title="Destination" key="source" align="left" render={this.showIP} />
                <Column title="Outbound" key="outbound" align="center" render={this.showOutbound} width={200} />
                <Column title="Inbound" key="inbound" align="center" render={this.showInbound} width={200} />
              </Table>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  componentDidMount() {
    this.countryMap = new Map();
    this.updateData();
    this.timer = setInterval(this.updateData, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }
}

export default MainWindow;
