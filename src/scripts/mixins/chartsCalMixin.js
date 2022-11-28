const chartsCalMixin = {
    methods: {

        loadCalendar: async function(param, param2) {
            console.log("\nLOADING CALENDAR")
            this.renderingCharts = true
            this.totalCalendarMounted = false
            this.miniCalendarsData = []
            this.calendarMonths = []

            if (this.currentPage.id == "daily" ||  this.currentPage.id == 'calendar') {
                calCumulatedParam = parseInt(localStorage.getItem('calCumulatedParamDaily'))
            }
            if (this.currentPage.id == "videos") {
                calCumulatedParam = parseInt(localStorage.getItem('calCumulatedParamVideos'))
            }

            /* ---- 1: GET CALENDAR DATES ---- */
            console.log(" -> Getting calendar dates")
            await new Promise((resolve, reject) => {

                if (param == undefined) {
                    param = 0
                }

                if (param == "filter") {
                    let temp = {}
                    temp.start = dayjs.tz(param2, this.tradeTimeZone).unix()
                    temp.end = dayjs.tz(param2, this.tradeTimeZone).endOf("month").unix()
                    this.selectedCalRange = temp
                    console.log("selectedCalRange " + JSON.stringify(this.selectedCalRange))
                    localStorage.setItem('selectedCalRange', JSON.stringify(this.selectedCalRange))
                } else {
                    /* contrary to filtered trades in tradesMixin, here we need to .tz because we are recreating date */

                    this.selectedCalRange.start = dayjs.tz(this.selectedCalRange.start * 1000, this.tradeTimeZone).add(param, 'month').startOf('month').unix()
                        /* reuse just created .start because we only show one month at a time */
                    this.selectedCalRange.end = dayjs.tz(this.selectedCalRange.start * 1000, this.tradeTimeZone).endOf('month').unix()
                        //console.log("this.selectedCalRange.start " + this.selectedCalRange.start+" this.selectedCalRange.end " + this.selectedCalRange.end)
                    localStorage.setItem('selectedCalRange', JSON.stringify(this.selectedCalRange))
                }
                resolve()

            })

            /* ---- 2: CREATE CALENDAR ---- */
            console.log(" -> Creating calendar dates")
            const createCalendar = async(param1, param2) => {
                //console.log("param 1 "+param1)
                return new Promise(async(resolve, reject) => {
                    let dateForCalendarize = new Date(param1*1000) // as per docs https://github.com/lukeed/calendarize/, calendarize casts to date so Instead of using string I have to use date or else used the node / user timezone instead of the timezone set in param 1 earlier 
                    //console.log(" date for calendarize "+dateForCalendarize)
                    let calendarizeData = calendarize(dateForCalendarize, 1) // this creates calendar date numbers needed for a table calendar
                    //console.log("calendarizeData "+calendarizeData)
                    let calendarJson = {}
                    let month = dayjs.unix(param1).get('month') + 1 //starts at 0
                    let year = dayjs.unix(param1).get('year')
                    let calTrade

                    if (this.threeMonthsBack <= param1) {
                        if (this.threeMonthsTrades.length > 0) {
                            console.log(" -> Getting existing variable")
                            calTrade = this.threeMonthsTrades
                        } else {
                            console.log(" -> Checking tradese in IndexedDB")
                            let dataExistsInIndexedDB = await this.checkTradesInIndexedDB(6)
                            console.log(" -> Daily - threeMonthsBack size in indexedDB: " + this.formatBytes(new Blob([JSON.stringify(this.threeMonthsTrades)]).size))
                            if (!dataExistsInIndexedDB) {
                                await this.getTradesFromDb(6)
                            }
                            calTrade = this.threeMonthsTrades
                        }
                    } else {
                        if (this.allTrades.length > 0) {
                            calTrade = this.allTrades
                        } else {
                            let dataExistsInIndexedDB = await this.checkTradesInIndexedDB(0)
                            if (!dataExistsInIndexedDB) {
                                await this.getTradesFromDb(0)
                            }
                            calTrade = this.allTrades
                        }
                    }

                    calendarizeData.forEach((element, index) => {
                        //console.log("element "+element)
                        calendarJson[index] = []
                        element.forEach((element2) => {
                            // 1- Create a calendar date from each element2 (calendar number)
                            var elementDate = year + "/" + month + "/" + element2
                            var elementDateUnix = dayjs(elementDate).unix()
                            //console.log("element2  "+element2)

                            // 2- Create data for each calendar box
                            let tempData = {}
                            tempData.month = this.monthFormat(param1) // day number of the month
                            //console.log("month "+tempData.month)
                            tempData.day = element2 // day number of the month
                            tempData.dateUnix = elementDateUnix // date in unix

                            //Using allTrades and not filteredTrades because we do not want calendar to be filtered
                            //console.log("selectedRange "+param1.start)

                            let trade = calTrade.filter(f => dayjs.unix(f.dateUnix).isSame(dayjs.unix(elementDateUnix), 'day')) // filter by finding the same day of month between calendar date and unix date in DB

                            if (trade.length && element2 != 0) { //Check also if not null because day in date cannot be 0
                                tempData.pAndL = trade[0].pAndL
                            } else {
                                tempData.pAndL = []
                            }
                            //console.log("tempData "+JSON.stringify(tempData))
                            calendarJson[index].push(tempData)

                        })

                    })
                    if (param1 == this.selectedCalRange.start) {
                        this.calendarData = calendarJson
                        //console.log("calendarData "+JSON.stringify(this.calendarData))
                    } else {
                        this.miniCalendarsData.push(calendarJson)
                    }
                    resolve()
                })
            }

            let currentMonthNumber = dayjs(this.selectedCalRange.start * 1000).month()
            let i = 0
            if (this.currentPage.id == 'calendar') {
                while (i <= currentMonthNumber) {
                    let tempUnix = dayjs.tz(this.selectedCalRange.start * 1000, this.tradeTimeZone).subtract(i, 'month').startOf('month').unix()
                        //this.calendarMonths.push(this.monthFormat(tempUnix))
                    await createCalendar(tempUnix)
                    i++
                }
            } else {
                await createCalendar(this.selectedCalRange.start)
            }
            /*await createCalendar("full", this.selectedCalRange.start)
            await createCalendar("mini", dayjs.tz(this.selectedCalRange.start * 1000, this.tradeTimeZone).subtract(1, 'month').startOf('month').unix())
            await createCalendar("mini", dayjs.tz(this.selectedCalRange.start * 1000, this.tradeTimeZone).subtract(2, 'month').startOf('month').unix())*/
            this.totalCalendarMounted = true
                //console.log("calendarData "+JSON.stringify(this.calendarData))
            //console.log("miniCalData " + JSON.stringify(this.miniCalendarsData))



            /* ---- 3: GET TRADES AND LOAD CHARTS ---- */

            //In dashboard, filter is dependant on the filter input on top of page
            //In daily, filter is dependant on the calendar

            //await 1 : create filtered trades
            await new Promise((resolve, reject) => {
                //console.log("all " + JSON.stringify(this.allTrades))
                if (param != 0) {
                    console.log("start " + this.selectedCalRange.start)
                    if (this.threeMonthsBack <= this.selectedCalRange.start) {
                        this.filteredTrades = this.threeMonthsTrades.filter(f => f.dateUnix >= this.selectedCalRange.start && f.dateUnix < this.selectedCalRange.end);
                    } else {
                        this.filteredTrades = this.allTrades.filter(f => f.dateUnix >= this.selectedCalRange.start && f.dateUnix < this.selectedCalRange.end);
                    }

                }
                this.filteredTrades.sort(function(a, b) {
                        return b.dateUnix - a.dateUnix
                    })
                    //console.log("filered trades " + JSON.stringify(this.filteredTrades))
                resolve()
            })
            if (this.currentPage.id == "videos") {
                await this.checkVideo()
            }

            // If you want await, you then need a promise. Await can only be placed inside async function

            //await 2 : re-render DOM in order to create new charts
            //await (this.renderData += 1)
            if (this.currentPage.id == "daily") {
                await (this.spinnerSetupsUpdate = false)
                //Rendering double line chart
                //console.log("filtered trades "+JSON.stringify(this.filteredTrades))
                await this.filteredTrades.forEach(el => {
                    //console.log(" date "+el.dateUnix)
                    var chartId = 'doubleLineChart' + el.dateUnix
                    var chartDataGross = []
                    var chartDataNet = []
                    var chartCategories = []
                    el.trades.forEach(element => {
                        var proceeds = Number((element.grossProceeds).toFixed(2))
                            //console.log("proceeds "+proceeds)
                        var proceedsNet = Number((element[this.amountCase + 'Proceeds']).toFixed(2))
                        if (chartDataGross.length == 0) {
                            chartDataGross.push(proceeds)
                        } else {
                            chartDataGross.push(chartDataGross.slice(-1).pop() + proceeds)
                        }

                        if (chartDataNet.length == 0) {
                            chartDataNet.push(proceedsNet)
                        } else {
                            chartDataNet.push(chartDataNet.slice(-1).pop() + proceedsNet)
                        }
                        chartCategories.push(this.hourMinuteFormat(element.exitTime))
                            //console.log("chartId "+chartId+", chartDataGross "+chartDataGross+", chartDataNet "+chartDataNet+", chartCategories "+chartCategories)
                        this.doubleLineChart(chartId, chartDataGross, chartDataNet, chartCategories)
                    });
                })

                //Rendering pie chart
                await this.filteredTrades.forEach(el => {
                    var chartId = "pieChart" + el.dateUnix
                    var probWins = (el.pAndL[this.amountCase + 'WinsCount'] / el.pAndL.trades)
                    var probLoss = (el.pAndL[this.amountCase + 'LossCount'] / el.pAndL.trades)
                        //var probNetWins = (el.pAndL.netWinsCount / el.pAndL.trades)
                        //var probNetLoss = (el.pAndL.netLossCount / el.pAndL.trades)
                        //console.log("prob net win " + probNetWins + " and loss " + probNetLoss)
                    this.pieChart(chartId, probWins, probLoss, this.currentPage.id)
                })

            }
            await (this.renderingCharts = false)
            await (this.spinnerSetupsUpdate = false)

        },

        lineChart(param) { //chartID, chartDataGross, chartDataNet, chartCategories
            //console.log("  --> " + param)
            return new Promise((resolve, reject) => {
                var myChart = echarts.init(document.getElementById(param));
                var chartData = []
                var chartXAxis = []
                var wins = 0
                var loss = 0
                var profitFactor = 0
                var weekOfYear = null
                var monthOfYear = null
                var i = 1

                let objectY = JSON.parse(JSON.stringify(this.totalsByDate))
                const keys = Object.keys(objectY);

                for (const key of keys) {
                    var element = objectY[key]

                    var pushingChartData = () => {
                        chartData.push(profitFactor)
                    }

                    if (this.selectedTimeFrame == "daily") {
                        wins = element[this.amountCase + 'Wins']
                        loss = -element[this.amountCase + 'Loss']
                            //console.log("wins " + wins + " and loss " + loss)
                        if (loss != 0) {
                            profitFactor = wins / loss
                        }
                        chartXAxis.push(this.chartFormat(key))
                        pushingChartData()
                    }

                    if (this.selectedTimeFrame == "weekly") {
                        //First value
                        if (weekOfYear == null) {
                            weekOfYear = dayjs.unix(key).isoWeek()
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                            chartXAxis.push(this.chartFormat(key))

                        } else if (weekOfYear == dayjs.unix(key).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                        }
                        if (dayjs.unix(key).isoWeek() != weekOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            if (loss != 0) {
                                profitFactor = wins / loss
                            }
                            pushingChartData()

                            //New week, new proceeds
                            wins = 0
                            loss = 0
                            profitFactor = 0
                            weekOfYear = dayjs.unix(key).isoWeek()
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            if (loss != 0) {
                                profitFactor = wins / loss
                            }
                            pushingChartData()
                                //console.log("Last element")
                        }
                    }

                    if (this.selectedTimeFrame == "monthly") {
                        //First value
                        if (monthOfYear == null) {
                            monthOfYear = dayjs.unix(key).month()
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                            chartXAxis.push(this.chartFormat(key))

                        }
                        //Same month. Let's continue adding proceeds
                        else if (monthOfYear == dayjs.unix(key).month()) {
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                        }
                        if (dayjs.unix(key).month() != monthOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            profitFactor = wins / loss
                            pushingChartData()

                            //New month, new proceeds
                            wins = 0
                            loss = 0
                            profitFactor = 0
                            monthOfYear = dayjs.unix(key).month()
                            wins += element[this.amountCase + 'Wins']
                            loss += -element[this.amountCase + 'Loss']
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('month') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            profitFactor = wins / loss
                            pushingChartData()
                        }
                    }
                    i++

                    //console.log("element "+JSON.stringify(element))
                }
                option = {
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: this.blackbg7,
                        borderColor: this.blackbg7,
                        textStyle: {
                            color: this.white87
                        },
                        formatter: (params) => {
                            return params[0].value.toFixed(2)

                        }
                    },
                    axisLabel: {
                        interval: 1000,
                    },
                    xAxis: {
                        type: 'category',
                        data: chartXAxis,
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: {
                            lineStyle: {
                                type: 'solid',
                                color: this.cssColor38
                            }
                        },
                        axisLabel: {
                            formatter: (params) => {
                                return params.toFixed(2)
                            }
                        },
                    },
                    series: [{
                        data: chartData,
                        type: 'line',
                        smooth: true,
                        itemStyle: {
                            color: '#35C4FE',
                        },
                        emphasis: {
                            itemStyle: {
                                color: '#01B4FF'
                            }
                        },
                    }]
                }
                myChart.setOption(option);
                resolve()
            })
        },

        doubleLineChart(param1, param2, param3, param4) { //chartID, chartDataGross, chartDataNet, chartCategories
            //console.log("param1 "+param1+", param2 "+param2+", param3 "+param3+", param4 "+param4)
            return new Promise((resolve, reject) => {
                //console.log("param1 "+param1)
                var myChart = echarts.init(document.getElementById(param1));
                option = {
                        tooltip: {
                            trigger: 'axis',
                            backgroundColor: this.blackbg7,
                            borderColor: this.blackbg7,
                            textStyle: {
                                color: this.white87
                            },
                            formatter: (params) => {
                                var gross
                                var net
                                var time
                                params.forEach((element, index) => {
                                    //console.log('element ' + JSON.stringify(element))
                                    if (index == 0) {
                                        gross = element.value.toFixed(0) + "$"
                                        time = element.name
                                    }
                                    if (index == 1) {
                                        net = element.value.toFixed(0) + "$"
                                    }
                                });
                                //console.log("params "+JSON.stringify(params[0][0]))
                                //console.log('time format ' + typeof time + "time " + time)
                                return time + "<br>Gross: " + gross + "<br>Net: " + net

                            }
                        },
                        axisLabel: {

                        },
                        xAxis: {
                            data: param4,
                            name: '0',
                            nameLocation: 'start',
                        },
                        yAxis: {
                            type: 'value',
                            /*scale: true,
                            max: function(value) {
                                return value.max;
                            },
                            min: function(value) {
                                return value.min;
                            },*/
                            axisLabel: {
                                show: false,
                                formatter: (params) => {
                                    return params.toFixed(0) + "$"
                                }
                            },
                            splitLine: {
                                show: false
                            },
                        },
                        series: [{
                                data: param2,
                                showSymbol: false, //removes dot on line
                                type: 'line',
                                smooth: true,
                                itemStyle: {
                                    color: '#35C4FE',
                                },
                                emphasis: {
                                    itemStyle: {
                                        color: '#01B4FF'
                                    }
                                },
                            },
                            {
                                data: param3,
                                showSymbol: false, //removes dot on line
                                type: 'line',
                                smooth: true,
                                itemStyle: {
                                    color: '#9AE3FD',
                                },
                                emphasis: {
                                    itemStyle: {
                                        color: '#9AE3FD'
                                    }
                                },
                            }
                        ],
                    },
                    myChart.setOption(option);
                resolve()
            })
        },

        lineBarChart(param) {
            //console.log("  --> " + param)
            return new Promise((resolve, reject) => {
                var myChart = echarts.init(document.getElementById(param));
                var chartData = []
                var chartBarData = []
                var chartXAxis = []
                var sumProceeds = 0
                var weekOfYear = null
                var monthOfYear = null
                var i = 1

                let objectY = JSON.parse(JSON.stringify(this.totalsByDate))
                const keys = Object.keys(objectY);

                for (const key of keys) {
                    var element = objectY[key]
                    var proceeds = 0

                    var pushingChartBarData = () => {
                        if (keys.length <= this.maxChartValues) {
                            var temp = {}
                            temp.value = proceeds
                            temp.label = {}
                            temp.label.show = true
                            if (proceeds >= 0) {
                                temp.label.position = 'top'
                            } else {
                                temp.label.position = 'bottom'
                            }
                            temp.label.formatter = (params) => {
                                return this.thousandCurrencyFormat(params.value)
                            }
                            chartBarData.push(temp)
                        } else {
                            chartBarData.push(proceeds)
                        }
                    }

                    var pushingChartData = () => {
                        if (chartData.length == 0) {
                            chartData.push(proceeds)
                        } else {
                            chartData.push(chartData.slice(-1).pop() + proceeds)
                        }
                    }

                    if (this.selectedTimeFrame == "daily") {
                        proceeds = element[this.amountCase + 'Proceeds']
                        chartXAxis.push(this.chartFormat(key))
                        pushingChartBarData()
                        pushingChartData()
                    }

                    if (this.selectedTimeFrame == "weekly") {
                        //First value
                        if (weekOfYear == null) {
                            weekOfYear = dayjs.unix(key).isoWeek()
                            sumProceeds += element[this.amountCase + 'Proceeds']
                                //console.log("First run. Week of year: "+weekOfYear+" and month of year "+ dayjs.unix(key).month()+" and start of week "+dayjs.unix(key).startOf('isoWeek')+" and month of start of week "+dayjs.unix(dayjs.unix(key).startOf('isoWeek')/1000).month())
                                //If start of week is another month
                                /*if (dayjs.unix(key).month() != dayjs.unix(dayjs.unix(key).startOf('isoWeek') / 1000).month()) {
                                    chartXAxis.push(this.chartFormat(key))
                                } else {
                                    chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                                }*/
                                //First I did the logic above. But I realized that it makes difficult to compare. Expl: 1 month you will have from 1/09, then 06/09. But then, last two weeks, the 06/09 value will not be the same, because two weeks back is actually starting at 07/09.So, for the first, we always push the key
                            chartXAxis.push(this.chartFormat(key))

                        } else if (weekOfYear == dayjs.unix(key).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time
                            //console.log("Same week. Week of year: " + weekOfYear)
                            sumProceeds += element[this.amountCase + 'Proceeds']
                        }
                        if (dayjs.unix(key).isoWeek() != weekOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            proceeds = sumProceeds
                            pushingChartBarData()
                            pushingChartData()

                            //New week, new proceeds
                            sumProceeds = 0
                            weekOfYear = dayjs.unix(key).isoWeek()
                                //console.log("New week. Week of year: " + weekOfYear + " and start of week " + dayjs.unix(key).startOf('isoWeek'))
                            sumProceeds += element[this.amountCase + 'Proceeds']
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            proceeds = sumProceeds
                            pushingChartBarData()
                            pushingChartData()
                                //console.log("Last element")
                        }
                    }

                    if (this.selectedTimeFrame == "monthly") {
                        //First value
                        if (monthOfYear == null) {
                            monthOfYear = dayjs.unix(key).month()
                            sumProceeds += element[this.amountCase + 'Proceeds']
                            chartXAxis.push(this.chartFormat(key))

                        }
                        //Same month. Let's continue adding proceeds
                        else if (monthOfYear == dayjs.unix(key).month()) {
                            //console.log("Same week. Week of year: " + monthOfYear)
                            sumProceeds += element[this.amountCase + 'Proceeds']
                        }
                        if (dayjs.unix(key).month() != monthOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            proceeds = sumProceeds
                            pushingChartBarData()
                            pushingChartData()

                            //New month, new proceeds
                            sumProceeds = 0
                            monthOfYear = dayjs.unix(key).month()
                                //console.log("New week. Week of year: " + monthOfYear + " and start of week " + dayjs.unix(key).startOf('month'))
                            sumProceeds += element[this.amountCase + 'Proceeds']
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('month') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            proceeds = sumProceeds
                            pushingChartBarData()
                            pushingChartData()
                            sumProceeds = 0
                                //console.log("Last element")
                        }
                    }
                    i++

                    //console.log("element "+JSON.stringify(element))
                }
                option = {
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: this.blackbg7,
                        borderColor: this.blackbg7,
                        textStyle: {
                            color: this.white87
                        },
                        formatter: (params) => {
                            var proceeds
                            var cumulProceeds
                            var date
                            params.forEach((element, index) => {
                                if (index == 0) {
                                    cumulProceeds = this.thousandCurrencyFormat(element.value)
                                    date = element.name
                                }
                                if (index == 1) {
                                    proceeds = this.thousandCurrencyFormat(element.value)
                                }
                            });
                            //console.log("params "+JSON.stringify(params[0][0]))
                            return date + "<br>Proceeds: " + proceeds + "<br>Cumulated: " + cumulProceeds

                        }
                    },
                    axisLabel: {
                        interval: 1000,
                    },
                    xAxis: {
                        type: 'category',
                        data: chartXAxis,
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: {
                            lineStyle: {
                                type: 'solid',
                                color: this.cssColor38
                            }
                        },
                        axisLabel: {
                            formatter: (params) => {
                                return this.thousandCurrencyFormat(params)
                            }
                        },
                    },
                    series: [{
                            data: chartData,
                            type: 'line',
                            smooth: true,
                            itemStyle: {
                                color: '#35C4FE',
                            },
                            emphasis: {
                                itemStyle: {
                                    color: '#01B4FF'
                                }
                            },
                        },
                        {
                            data: chartBarData,
                            type: 'bar',
                            smooth: true,
                            label: {
                                color: this.cssColor87
                            },
                            itemStyle: {
                                color: '#35C4FE',
                            },
                            emphasis: {
                                itemStyle: {
                                    color: '#01B4FF'
                                }
                            },
                        }
                    ]
                }
                myChart.setOption(option);
                resolve()
            })
        },

        pieChart(param1, param2, param3) { //chart ID, winShare, lossShare, page
            return new Promise((resolve, reject) => {
                //console.log("  --> " + param1)
                //console.log("para 2 " + param2 + " and 3 " + param3)
                var myChart = echarts.init(document.getElementById(param1));
                var winShare = param2
                var lossShare = param3
                option = {
                    series: [{
                            type: 'pie',
                            radius: ['70%', '100%'],
                            avoidLabelOverlap: false,
                            data: [
                                { value: winShare, name: "Win Share" },
                                { value: lossShare, name: "Loss Share" },
                            ],
                            itemStyle: {
                                color: (params) => {
                                    if (params.dataIndex == 0) {
                                        return '#00CA73'
                                    }
                                    if (params.dataIndex == 1) {
                                        return '#f2f2f4'
                                    }
                                }
                            },
                            label: {
                                show: true,
                                position: 'center',
                                color: this.cssColor87,
                                formatter: (params) => {
                                    if (this.currentPage.id == "dashboard") {
                                        return this.oneDecPercentFormat(winShare) + "\nWin rate"
                                    }
                                    if (this.currentPage.id == "daily") {
                                        return this.oneDecPercentFormat(winShare)
                                    }
                                }
                            }
                        },

                    ]
                };
                myChart.setOption(option);
                resolve()
            })
        },

        barChart(param1) {
            //console.log("  --> " + param1)
            return new Promise((resolve, reject) => {
                var chartData = []
                var chartXAxis = []
                var sumWinsCount = 0
                var sumLossCount = 0
                var sumTrades = 0
                var sumWins = 0
                var sumLoss = 0
                var sumSharePLWins = 0
                var sumSharePLLoss = 0
                var sumWinsCount = 0
                var sumLossCount = 0

                var probWins
                var probLoss
                var avgWins
                var avgLoss
                var avgSharePLWins
                var avgSharePLLoss
                var appt
                var appspt

                var weekOfYear = null
                var monthOfYear = null
                var i = 1

                //console.log("totals " + JSON.stringify(this.totalsByDate))
                let objectY = JSON.parse(JSON.stringify(this.totalsByDate))
                const keys = Object.keys(objectY);
                for (const key of keys) {
                    var element = objectY[key]
                    var ratio
                    var pushingChartData = () => {
                        if (this.selectedRatio == "appt") {
                            ratio = appt
                        } else {
                            ratio = appspt
                        }

                        if (param1 == "barChart1") {
                            if (keys.length <= this.maxChartValues) {
                                var temp = {}
                                temp.value = ratio
                                temp.label = {}
                                temp.label.show = true
                                if (ratio >= 0) {
                                    temp.label.position = 'top'
                                } else {
                                    temp.label.position = 'bottom'
                                }
                                temp.label.formatter = (params) => {
                                    return this.twoDecCurrencyFormat(params.value)
                                }
                                chartData.push(temp)
                            } else {
                                chartData.push(ratio)
                            }
                        }
                        if (param1 == "barChart2") {
                            if (keys.length <= this.maxChartValues) {
                                var temp = {}
                                temp.value = probWins
                                temp.label = {}
                                temp.label.show = true
                                temp.label.position = 'top'
                                temp.label.formatter = (params) => {
                                    return this.oneDecPercentFormat(params.value)
                                }
                                chartData.push(temp)
                            } else {
                                chartData.push(probWins)
                            }

                        }
                    }

                    var sumElements = () => {
                        sumWinsCount += element[this.amountCase + 'WinsCount']
                        sumTrades += element.trades
                        sumLossCount += element[this.amountCase + 'LossCount']
                        sumWins += element[this.amountCase + 'Wins']
                        sumLoss += element[this.amountCase + 'Loss']
                        sumSharePLWins += element[this.amountCase + 'SharePLWins']
                        sumSharePLLoss += element[this.amountCase + 'SharePLLoss']
                    }

                    var createAP = () => {
                        probWins = (sumWinsCount / sumTrades)
                        probLoss = (sumLossCount / sumTrades)

                        avgWins = sumWinsCount == 0 ? 0 : (sumWins / sumWinsCount)
                        avgLoss = sumLossCount == 0 ? 0 : -(sumLoss / sumLossCount)

                        avgSharePLWins = sumWinsCount == 0 ? 0 : (sumSharePLWins / sumWinsCount)
                        avgSharePLLoss = sumLossCount == 0 ? 0 : -(sumSharePLLoss / sumLossCount)

                        appt = (probWins * avgWins) - (probLoss * avgLoss)
                        appspt = (probWins * avgSharePLWins) - (probLoss * avgSharePLLoss)
                    }

                    if (this.selectedTimeFrame == "daily") {
                        var probWins = (element[this.amountCase + 'WinsCount'] / element.trades)
                        var probLoss = (element[this.amountCase + 'LossCount'] / element.trades)

                        var avgWins = element[this.amountCase + 'WinsCount'] == 0 ? 0 : (element[this.amountCase + 'Wins'] / element[this.amountCase + 'WinsCount'])
                        var avgLoss = element[this.amountCase + 'LossCount'] == 0 ? 0 : -(element[this.amountCase + 'Loss'] / element[this.amountCase + 'LossCount'])

                        //element[this.amountCase + 'SharePLWins'] is from totals (by date) so it's a sum of share PL wins => the average is divided by the total number of wins
                        var avgSharePLWins = element[this.amountCase + 'WinsCount'] == 0 ? 0 : (element[this.amountCase + 'SharePLWins'] / element[this.amountCase + 'WinsCount'])
                        var avgSharePLLoss = element[this.amountCase + 'LossCount'] == 0 ? 0 : -(element[this.amountCase + 'SharePLLoss'] / element[this.amountCase + 'LossCount'])

                        appt = (probWins * avgWins) - (probLoss * avgLoss)
                        appspt = (probWins * avgSharePLWins) - (probLoss * avgSharePLLoss)

                        chartXAxis.push(this.chartFormat(key))
                        pushingChartData()
                    }


                    if (this.selectedTimeFrame == "weekly") {
                        //First value
                        if (weekOfYear == null) {
                            weekOfYear = dayjs.unix(key).isoWeek()
                            sumElements()
                            chartXAxis.push(this.chartFormat(key))

                        } else if (weekOfYear == dayjs.unix(key).isoWeek()) {
                            sumElements()
                        }
                        if (dayjs.unix(key).isoWeek() != weekOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            createAP()
                            pushingChartData()

                            //New week, new proceeds
                            sumWinsCount = 0
                            sumLossCount = 0
                            sumTrades = 0
                            sumWins = 0
                            sumLoss = 0
                            sumSharePLWins = 0
                            sumSharePLLoss = 0
                            sumWinsCount = 0
                            sumLossCount = 0

                            weekOfYear = dayjs.unix(key).isoWeek()
                                //console.log("New week. Week of year: " + weekOfYear + " and start of week " + dayjs.unix(key).startOf('isoWeek'))
                            sumElements()
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            createAP()
                            pushingChartData()
                                //console.log("Last element")
                        }
                    }

                    if (this.selectedTimeFrame == "monthly") {
                        //First value
                        if (monthOfYear == null) {
                            monthOfYear = dayjs.unix(key).month()
                            sumElements()
                            chartXAxis.push(this.chartFormat(key))

                        }
                        //Same month. Let's continue adding proceeds
                        else if (monthOfYear == dayjs.unix(key).month()) {
                            sumElements()
                        }
                        if (dayjs.unix(key).month() != monthOfYear) {
                            //When week changes, we create values proceeds and push both chart datas
                            createAP()
                            pushingChartData()

                            //New week, new proceeds
                            sumWinsCount = 0
                            sumLossCount = 0
                            sumTrades = 0
                            sumWins = 0
                            sumLoss = 0
                            sumSharePLWins = 0
                            sumSharePLLoss = 0
                            sumWinsCount = 0
                            sumLossCount = 0

                            monthOfYear = dayjs.unix(key).month()
                                //console.log("New week. Week of year: " + monthOfYear + " and start of week " + dayjs.unix(key).startOf('month'))
                            sumElements()
                            chartXAxis.push(this.chartFormat(dayjs.unix(key).startOf('month') / 1000))
                        }
                        if (i == keys.length) {
                            //Last key. We wrap up.
                            createAP()
                            pushingChartData()
                        }
                    }
                    //console.log("proceeds " + proceeds)
                    i++


                }
                var myChart = echarts.init(document.getElementById(param1));
                option = {
                    xAxis: {
                        type: 'category',
                        data: chartXAxis
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: {
                            lineStyle: {
                                type: 'solid',
                                color: this.cssColor38
                            }
                        },
                        axisLabel: {
                            formatter: (params) => {
                                if (param1 == "barChart2") {
                                    return this.oneDecPercentFormat(params)
                                }
                                if (param1 == "barChart1") {
                                    return this.thousandCurrencyFormat(params)
                                }
                            }
                        },
                    },
                    series: [{
                        data: chartData,
                        type: 'bar',
                        label: {
                            color: this.cssColor87
                        },
                        itemStyle: {
                            color: '#35C4FE',
                        },
                        emphasis: {
                            itemStyle: {
                                color: '#01B4FF'
                            }
                        },
                    }],
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: this.blackbg7,
                        borderColor: this.blackbg7,
                        textStyle: {
                            color: this.white87
                        },
                        formatter: (params) => {
                            if (param1 == "barChart2") {
                                return params[0].name + ": " + this.oneDecPercentFormat(params[0].value)
                            }
                            if (param1 == "barChart1") {
                                return params[0].name + ": " + this.twoDecCurrencyFormat(params[0].value)
                            }
                        }
                    },
                };
                myChart.setOption(option);
                resolve()
            })
        },

        barChartNegative(param1) {
            //console.log("  --> " + param1)
            return new Promise((resolve, reject) => {
                var yAxis = []
                var series = []
                if (param1 == "barChartNegative1") {
                    var keyObject = this.groups.timeframe
                }
                if (param1 == "barChartNegative2") {
                    var keyObject = this.groups.duration
                }
                if (param1 == "barChartNegative3") {
                    var keyObject = this.groups.day
                }
                if (param1 == "barChartNegative4") {
                    var keyObject = this.groups.trades
                }
                if (param1 == "barChartNegative7") {
                    var keyObject = this.groups.executions
                }
                if (param1 == "barChartNegative10") {
                    const toRemove = ['null', 'undefined'];
                    var keyObject = _.omit(this.groups.patterns, toRemove)
                        //console.log("filtered "+JSON.stringify(keyObject))
                }
                if (param1 == "barChartNegative11") {
                    const toRemove = ['null', 'undefined'];
                    var keyObject = _.omit(this.groups.patternTypes, toRemove)
                        //console.log("filtered "+JSON.stringify(filteredObj))
                }
                if (param1 == "barChartNegative15") {
                    const toRemove = ['null', 'undefined'];
                    var keyObject = _.omit(this.groups.mistakes, toRemove)
                        //console.log("filtered "+JSON.stringify(filteredObj))
                }

                if (param1 == "barChartNegative12") {
                    var keyObject = this.groups.shareFloat
                }

                if (param1 == "barChartNegative13") {
                    var keyObject = this.groups.entryPrice
                }

                if (param1 == "barChartNegative14") {
                    var keyObject = this.groups.mktCap
                }

                if (param1 == "barChartNegative16") {
                    var keyObject = this.groups.symbols
                }

                const keys = Object.keys(keyObject);

                //console.log("object " + JSON.stringify(keyObject))
                //console.log("keys " + JSON.stringify(keys))
                for (const key of keys) {
                    //console.log("key " + JSON.stringify(key))
                    let pushRatio = true
                    if (param1 == "barChartNegative10") {
                        let pattern = this.patterns.find(item => item.objectId === key)
                            //console.log("pattern name " + JSON.stringify(pattern))
                        if (pattern) {
                            yAxis.push(pattern.name) // unshift because I'm only able to sort timeframe ascending
                        } else {
                            pushRatio = false //this because I manage to remove pattern name from list, but the ratio is still calculated. So I need to mark it here
                        }
                        //console.log("yaxis "+JSON.stringify(yAxis))

                    } else if (param1 == "barChartNegative11") {
                        let pattern = this.patterns.find(item => item.type === key)
                            //console.log("patteern "+pattern)
                        yAxis.push(pattern.type) // unshift because I'm only able to sort timeframe ascending

                    } else if (param1 == "barChartNegative15") {
                        //console.log(" mistakes "+JSON.stringify(this.mistakes))
                        var mistakes = this.mistakes.find(item => item.objectId === key)
                            //console.log("mistakes "+mistakes)
                        yAxis.push(mistakes.name) // unshift because I'm only able to sort timeframe ascending

                    } else {
                        yAxis.unshift(key) // unshift because I'm only able to sort timeframe ascending
                    }
                    //console.log("yaxis "+JSON.stringify(yAxis))

                    var sumWinsCount = 0
                    var sumLossCount = 0
                    var sumWins = 0
                    var sumLoss = 0
                    var sumSharePLWins = 0
                    var sumSharePLLoss = 0
                    var trades = 0
                    var profitFactor = 0
                    var numElements = keyObject[key].length
                        //console.log("num elemnets " + numElements)
                    keyObject[key].forEach((element, index) => {
                        //console.log("index " + index)
                        //console.log("element " + JSON.stringify(element))
                        sumWinsCount += element[this.amountCase + 'WinsCount']
                        sumLossCount += element[this.amountCase + 'LossCount']
                        sumWins += element[this.amountCase + 'Wins']
                        sumLoss += element[this.amountCase + 'Loss']
                        sumSharePLWins += element[this.amountCase + 'SharePLWins']
                        sumSharePLLoss += element[this.amountCase + 'SharePLLoss']

                        if (param1 == "barChartNegative4") {
                            trades += element.trades
                        } else {
                            trades += element.tradesCount
                        }
                        //console.log("wins count "+element.sumWinsCount+", loss count "+element.sumLossCount+", wins "+element.wins+", loss "+element.netLoss+", trades "+element.tradesCount)
                        if (numElements == (index + 1)) {
                            if (trades > 0) {
                                var probWins = (sumWinsCount / trades)
                                var probLoss = (sumLossCount / trades)
                            } else {
                                var probWins = 0
                                var probLoss = 0
                            }

                            if (sumWinsCount > 0) {
                                var avgWins = (sumWins / sumWinsCount)
                            } else {
                                var avgWins = 0
                            }

                            if (sumLossCount > 0) {
                                var avgLoss = -(sumLoss / sumLossCount)
                            } else {
                                var avgLoss = 0
                            }

                            var avgSharePLWins = sumWinsCount == 0 ? 0 : (sumSharePLWins / sumWinsCount)
                            var avgSharePLLoss = sumLossCount == 0 ? 0 : -(sumSharePLLoss / sumLossCount)

                            var appt = (probWins * avgWins) - (probLoss * avgLoss)
                            var appspt = (probWins * avgSharePLWins) - (probLoss * avgSharePLLoss)

                            sumWins > 0 ? profitFactor = sumWins / -sumLoss : profitFactor = 0
                                //sumLoss > 0 ? profitFactor = sumWins / -sumLoss : profitFactor = "Infinity"

                            var ratio
                            if (this.selectedRatio == "appt") {
                                ratio = appt
                            }
                            if (this.selectedRatio == "appspt") {
                                ratio = appspt
                            }
                            if (this.selectedRatio == "profitFactor") {
                                ratio = profitFactor
                            }

                            if (param1 == "barChartNegative1" || param1 == "barChartNegative2" || param1 == "barChartNegative3" || param1 == "barChartNegative4" || param1 == "barChartNegative7" || param1 == "barChartNegative12" || param1 == "barChartNegative13" || param1 == "barChartNegative14" || param1 == "barChartNegative16") {
                                series.unshift(ratio)
                            }
                            if (param1 == "barChartNegative10" || param1 == "barChartNegative11" || param1 == "barChartNegative15") {
                                if (pushRatio) series.push(ratio)
                            }
                        }
                    })
                }
                if (param1 == "barChartNegative10" || param1 == "barChartNegative11" || param1 == "barChartNegative15" || param1 == "barChartNegative16") {
                    //1) combine the arrays:
                    var list = [];
                    for (var j = 0; j < series.length; j++)
                        list.push({ 'ratio': series[j], 'name': yAxis[j] });
                    //2) sort:
                    list.sort(function(a, b) {
                        return ((a.ratio < b.ratio) ? -1 : ((a.ratio == b.ratio) ? 0 : 1));
                        //Sort could be modified to, for example, sort on the age 
                        // if the name is the same.
                    });
                    //3) separate them back out:
                    for (var k = 0; k < list.length; k++) {
                        series[k] = list[k].ratio;
                        yAxis[k] = list[k].name;
                    }


                    /*var indices = Array.from(series.keys()).sort((a, b) => series[a] > series[b])

                    var sortedAPPT = indices.map(i => series[i])
                    var sortedName = indices.map(i => yAxis[i])*/
                    //console.log("Sorted ratio " + JSON.stringify(series)+" and names "+JSON.stringify(yAxis))

                }

                var myChart = echarts.init(document.getElementById(param1));
                option = {
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: this.blackbg7,
                        borderColor: this.blackbg7,
                        textStyle: {
                            color: this.white87
                        },
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: (params) => {
                            return this.twoDecCurrencyFormat(params[0].value)
                        }
                    },
                    grid: {
                        top: 80,
                        bottom: 30,
                        containLabel: true // or else the yaxis labels are cutout
                    },
                    xAxis: {
                        type: 'value',
                        position: 'bottom',
                        splitLine: {
                            lineStyle: {
                                type: 'solid',
                                color: this.cssColor38
                            }
                        },
                        axisLabel: {
                            formatter: (params) => {
                                if (this.selectedRatio == "profitFactor") {
                                    return params.toFixed(0)
                                } else {
                                    return this.thousandCurrencyFormat(params)
                                }
                            }
                        }
                    },
                    yAxis: {
                        type: 'category',
                        axisLine: { show: false },
                        axisLabel: { show: true },
                        axisTick: { show: false },
                        splitLine: { show: false },
                        data: yAxis,
                        axisLabel: {
                            formatter: (params) => {
                                if (param1 == "barChartNegative4") {
                                    if (params <= 30) {
                                        var range
                                        if (params <= 5) {
                                            range = 5
                                        } else {
                                            range = 4
                                        }
                                        return (params - range) + "-" + params
                                    }
                                    if (params > 30) {
                                        return "+30"
                                    }
                                } else if (param1 == "barChartNegative2") { //Duration
                                    //console.log("params "+params)
                                    if (params < 1) {
                                        return "00:00-00:59"
                                    }
                                    if (params >= 1 && params < 2) {
                                        return "01:00-01:59"
                                    }
                                    if (params >= 2 && params < 5) {
                                        return "02:00-04:59"
                                    }
                                    if (params >= 5 && params < 10) {
                                        return "05:00-09:59"
                                    }
                                    if (params >= 10 && params < 20) {
                                        return "10:00-19:59"
                                    }
                                    if (params >= 20 && params < 40) {
                                        return "20:00-39:59"
                                    }
                                    if (params >= 40 && params < 60) {
                                        return "40:00-59:59"
                                    }
                                    if (params >= 60) {
                                        return "+60:00"
                                    }
                                } else if (param1 == "barChartNegative3") { //Day of week
                                    //console.log(dayjs.updateLocale('en').weekdays[params])
                                    return dayjs.updateLocale('en').weekdays[params]
                                } else if (param1 == "barChartNegative13") {
                                    //console.log("params "+params)
                                    if (params < 30) {
                                        if (params < 5) {
                                            return "0-4.99$"
                                        } else {
                                            return params + "-" + (Number(params) + 4.99).toFixed(2) + "$"
                                        }
                                    }
                                    if (params >= 30) {
                                        return "+30$"
                                    }
                                } else if (param1 == "barChartNegative12") { //Float
                                    params = params / 1000000
                                    if (params < 20) {
                                        var range = 4.9
                                        if (params < 5) {
                                            return "0-" + (params + range) + "M"
                                        } else {
                                            return params + "M-" + (params + range) + "M"
                                        }
                                    }
                                    if (params >= 20 && params < 50) {
                                        var range = 9.9
                                        return params + "M-" + (params + range) + "M"
                                    }
                                    if (params >= 50) {
                                        return "+50M"
                                    }
                                } else if (param1 == "barChartNegative14") {
                                    params = params / 1000000
                                    if (params <= 50) {
                                        return "Nano-cap (0-" + params + "M)"
                                    }
                                    if (params > 50 && params <= 300) {
                                        return "Micro-cap (50M-" + params + "M)"
                                    }
                                    if (params > 300 && params <= 2000) {
                                        return "Small-cap (300M-" + params / 1000 + "B)"
                                    }
                                    if (params > 2000 && params <= 10000) {
                                        return "Mid-cap (2B-" + params / 1000 + "B)"
                                    } else {
                                        return "Big-cap (+10B)"
                                    }
                                } else {
                                    return params
                                }
                            }
                        },
                    },
                    series: [{
                        type: 'bar',
                        itemStyle: {
                            color: '#35C4FE',
                        },
                        label: {
                            show: true,
                            position: "right",
                            color: this.cssColor87,
                            formatter: (params) => {
                                if (this.selectedRatio == "profitFactor") {
                                    return params.value.toFixed(2)
                                } else {
                                    return this.twoDecCurrencyFormat(params.value)
                                }
                            }
                        },
                        data: series
                    }]
                };
                myChart.setOption(option);
                resolve()
            })
        },

        boxPlotChart() {
            //console.log("  --> boxPlotChart")
            return new Promise((resolve, reject) => {
                //console.log("totals "+JSON.stringify(this.filteredTrades))
                var myChart = echarts.init(document.getElementById('boxPlotChart1'));
                var dataArray = []
                var dateArray = []

                var sumSharePL = 0
                var sumTrades = 0
                var weekOfYear = null
                var monthOfYear = null
                var i = 1
                var numOfEl = 0
                this.filteredTrades.forEach(element => {
                    var sharePL = 0
                    var tradesLength = element.trades.length
                    element.trades.forEach(element => {
                        if (this.selectedTimeFrame == "daily") {
                            dataArray.push(element[this.amountCase + 'SharePL'])
                            dateArray.push(this.chartFormat(element.dateUnix))
                        }

                        if (this.selectedTimeFrame == "weekly") {
                            //First value
                            if (weekOfYear == null) {
                                weekOfYear = dayjs.unix(element.dateUnix).isoWeek()
                                sumSharePL += element[this.amountCase + 'SharePL']
                                numOfEl += 1
                                dateArray.push(this.chartFormat(element.dateUnix))

                            } else if (weekOfYear == dayjs.unix(element.dateUnix).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time
                                //console.log("Same week. Week of year: " + weekOfYear)
                                sumSharePL += element[this.amountCase + 'SharePL']
                                numOfEl += 1
                            }
                            if (dayjs.unix(element.dateUnix).isoWeek() != weekOfYear) {
                                //When week changes, we create values proceeds and push both chart datas
                                dataArray.push(sumSharePL / numOfEl)

                                //New week, new proceeds
                                sumSharePL = 0
                                numOfEl = 0

                                weekOfYear = dayjs.unix(element.dateUnix).isoWeek()
                                    //console.log("New week. Week of year: " + weekOfYear + " and start of week " + dayjs.unix(element.dateUnix).startOf('isoWeek'))
                                sumSharePL += element[this.amountCase + 'SharePL']
                                numOfEl += 1
                                dateArray.push(this.chartFormat(dayjs.unix(element.dateUnix).startOf('isoWeek') / 1000))
                            }
                            if (i == tradesLength) {
                                //Last key. We wrap up.
                                dataArray.push(sumSharePL / numOfEl)
                                    //console.log("Last element")
                            }
                        }

                        if (this.selectedTimeFrame == "monthly") {
                            //First value
                            if (monthOfYear == null) {
                                monthOfYear = dayjs.unix(element.dateUnix).month()
                                sumSharePL += element[this.amountCase + 'Proceeds']
                                chartXAxis.push(this.chartFormat(element.dateUnix))

                            }
                            //Same month. Let's continue adding proceeds
                            else if (monthOfYear == dayjs.unix(element.dateUnix).month()) {
                                //console.log("Same week. Week of year: " + monthOfYear)
                                sumSharePL += element[this.amountCase + 'Proceeds']
                            }
                            if (dayjs.unix(element.dateUnix).month() != monthOfYear) {
                                //When week changes, we create values proceeds and push both chart datas
                                proceeds = sumSharePL
                                pushingChartBarData()
                                pushingChartData()

                                //New month, new proceeds
                                sumSharePL = 0
                                monthOfYear = dayjs.unix(element.dateUnix).month()
                                    //console.log("New week. Week of year: " + monthOfYear + " and start of week " + dayjs.unix(element.dateUnix).startOf('month'))
                                sumSharePL += element[this.amountCase + 'Proceeds']
                                chartXAxis.push(this.chartFormat(dayjs.unix(element.dateUnix).startOf('month') / 1000))
                            }
                            if (i == tradesLength) {
                                //Last key. We wrap up.
                                proceeds = sumSharePL
                                pushingChartBarData()
                                pushingChartData()
                                sumSharePL = 0
                                    //console.log("Last element")
                            }
                        }
                        i++
                    });
                    //console.log("gross list " + listGrossSharePL)

                    //Sorting list



                });
                // specify chart configuration item and data
                option = {
                    dataset: [{
                        source: dataArray
                    }, {
                        transform: {
                            type: 'boxplot',
                            config: {
                                itemNameformatter: (params) => {
                                    return dateArray[params.value];
                                }
                            }
                        }
                    }, {
                        fromDatasetIndex: 1,
                        fromTransformResult: 1
                    }],
                    tooltip: {
                        trigger: 'item',
                        backgroundColor: this.blackbg7,
                        borderColor: this.blackbg7,
                        textStyle: {
                            color: this.white87
                        },
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: (params) => {
                            if (params.componentIndex == 0) {
                                return 'Maximum: ' + params.value[5].toFixed(2) + '$<br/>' +
                                    'Upper quartile: ' + params.value[4].toFixed(2) + '$<br/>' +
                                    'Median: ' + params.value[3].toFixed(2) + '$<br/>' +
                                    'Lower quartile: ' + params.value[2].toFixed(2) + '$<br/>' +
                                    'Minimum: ' + params.value[1].toFixed(2) + '$<br/>'
                            }
                            if (params.componentIndex == 1) {
                                return 'Outlier: ' + params.value[1].toFixed(2) + '$'
                            }
                        }
                    },
                    xAxis: {
                        type: 'category',
                        boundaryGap: true,
                        nameGap: 30,
                        splitArea: {
                            show: false
                        },
                        splitLine: {
                            show: false
                        }
                    },
                    yAxis: {
                        type: 'value',
                        splitArea: {
                            show: true
                        },
                        axisLabel: {
                            formatter: (params) => {
                                return params.toFixed(2) + "$"
                            }
                        },
                    },

                    series: [{
                            name: 'boxplot',
                            type: 'boxplot',
                            datasetIndex: 1,
                            itemStyle: {
                                borderColor: "#01B4FF"
                            },
                            emphasis: {
                                label: {
                                    show: true
                                }
                            },
                        },
                        {
                            name: 'outlier',
                            type: 'scatter',
                            datasetIndex: 2,
                            itemStyle: {
                                color: '#6c757d',
                            }
                        }
                    ]
                };
                myChart.setOption(option);
                resolve()
            })
        },
    }
}