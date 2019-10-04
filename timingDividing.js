app.controller("demo1Ctrl", ["$scope", "$rootScope", "$http", "$state", "$sessionStorage", "$timeout", "$window", "CONFIG", "$filter", "$stateParams", "moment", function ($scope, $rootScope, $http, $state, $sessionStorage, $timeout, $window, CONFIG, $filter, $stateParams, moment) {
    toastr.clear();
    $scope.mainLoaderIs = false;
    $scope.machineList = ["All", "A", "B", "C", "D"];
    $scope.allMachineNames = ["A", "B", "C", "D"];

    $scope.currentDate = new Date();
    $scope.todaysDate = moment(new Date()).format("YYYY-MM-DD");
    $scope.datePickerVal = moment(new Date()).format("YYYY-MM-DD");
    var crDate = moment($scope.currentDate).format("YYYY-MM-DD");
    $scope.currentDateForCheck = moment(new Date()).format("YYYY-MM-DD");

    //"2019-08-23 00:00:00" D,
    $scope.filterData = {
        "date": crDate + " " + "00:00:00",
        "machine": "All"
    };

    $scope.multiCallingFrom = function (callingParam) {
        //datePicker prevBtn nextBtn
        var getDateWithFormated = "";
        if (callingParam == "datePicker") {
            getDateWithFormated = moment($scope.datePickerMdl).format("YYYY-MM-DD");
        } else if (callingParam == "prevBtn") {
            var getPrevDate = moment($scope.currentDate).subtract(1, "days");
            getDateWithFormated = getPrevDate.format("YYYY-MM-DD");
        } else {
            var currentDateCkecker = moment($scope.currentDate).format("YYYY-MM-DD");
            if (currentDateCkecker != $scope.currentDateForCheck) {
                var getNextDate = moment($scope.currentDate).add(1, "days");
                getDateWithFormated = getNextDate.format("YYYY-MM-DD");
            } else {
                alert("No Data Available for Further Date");
                return false;
            }
        }
        $scope.datePickerMdl = new Date(getDateWithFormated);
        $scope.currentDate = new Date(getDateWithFormated);
        $scope.filterData.date = getDateWithFormated + " " + "00:00:00";
        $scope.filterData.machine = $scope.filterData.machine;
        $scope.collectingAllMachineData();
    };

    async function getDownTimeData(getDataObj) {
        var data = {
            "dateTime": getDataObj.date,
            "machine": getDataObj.machine
        };
        var resData = {};
        await $http({
            method: "POST",
            url: CONFIG.rootUrl + "rtServer/getDownUpErrors",
            headers: {
                "Content-Type": "application/json"
            },
            data: data
        }).then(function (response) {
            var dwnTimeArrayData = angular.copy(response.data.downtimeArray);
            var downtimeArray = [];
            var mach_str_time = "- -";
            var mach_end_time = "- -";

            if (dwnTimeArrayData.length > 0) {
                downtimeArray = dividing(dwnTimeArrayData);
                mach_str_time = moment(new Date(downtimeArray[0].startTime)).format("hh:mm A");
                var length = downtimeArray.length - 1;
                mach_end_time = moment(new Date(downtimeArray[length].endTime)).format("hh:mm A");
            }
            var obj = {
                downtimeArray: downtimeArray,
                excudedDT: response.data.excudedDT,
                machineName: data.machine,
                machineStartTime: mach_str_time,
                machineEndTime: mach_end_time
            };
            resData = obj;
        }, function (error) {
            console.log("Error: ", error);
        });
        return resData;
    };

    // Visualiser scale diving logic
    $scope.scaleData = function (resData) {
        $scope.newTime = [];
        var totalSec = (24 * 60) * 60;
        pixPerHour = totalSec / 24;
        PerCentageMargin = (pixPerHour / totalSec) * 100;
        PMargin = 0;

        var initialHour = "00 00 00";
        initialHour.split(" ");
        var getHours = initialHour[0];

        // Scale hour calculation starts here
        for (i = 0; i <= 24; i++) {
            var postHour = getHours++ + (":00");
            $scope.newTime.push({
                time: postHour,
                leftVal: {
                    "left": PMargin + "%"
                }
            });
            PMargin += PerCentageMargin;
        }

    };
    $scope.scaleData();

    // Visualiser color logic
    function dividing(resData) {
        var totalSecPerDay = (24 * 60) * 60;
        resData.forEach((object, i) => {
            //calculating left percentage
            var slotStartTime = new Date(object.startTime);
            var totalSecFromHour = slotStartTime.getHours() * 60 * 60;
            var totalSecFromMin = slotStartTime.getMinutes() * 60;
            var leftTotalSecs = totalSecFromHour + totalSecFromMin;
            var leftStartPercentage = leftTotalSecs / totalSecPerDay * 100;

            // calculating width percentage
            var errorStartTime = moment(new Date(object.startTime), "HH:mm:ss");
            var errorEndTime = moment(new Date(object.endTime), "HH:mm:ss");
            var widthTotalSecs = errorEndTime.diff(errorStartTime, "minutes") * 60;
            var widthPercentage = (widthTotalSecs / totalSecPerDay) * 100;

            object.errorTimeDuration = moment.utc(moment.duration(widthTotalSecs, "seconds").asMilliseconds()).format("HH:mm:ss");

            object.boxStyle = {
                "width": widthPercentage + "%",
                "left": leftStartPercentage + "%"
            };
        });
        return resData;
    };

    // repeat All Machines
    $scope.prevNdNextBtnDisableIs = false;
    $scope.allMachinesDataObj = [];
    $scope.collectingAllMachineData = function () {
        $scope.mainLoaderIs = true;
        $scope.prevNdNextBtnDisableIs = true;
        $scope.allMachinesDataObj = [];
        var callingArray = [];
        if ($scope.filterData.machine == "All") {
            callingArray = $scope.allMachineNames;
        } else {
            callingArray.push($scope.filterData.machine);
        }

        var cntr = 0;
        async function next() {
            if (cntr < callingArray.length) {
                var setDataObj = {
                    date: $scope.filterData.date,
                    machine: callingArray[cntr]
                };
                var res_data = await getDownTimeData(setDataObj);
                $scope.allMachinesDataObj.push(res_data);
                $scope.$apply();
                cntr++;
                next();
            } else {
                $scope.prevNdNextBtnDisableIs = false;
                $scope.mainLoaderIs = false;
                $scope.$apply();
            }
        }
        next();
    };
    $scope.collectingAllMachineData();

    $scope.machineErrorObj = {};
    $scope.getAllErrorObj = function (getObj) {
        var error_date = moment(new Date(getObj.startTime)).format("DD MMM, YYYY");
        var error_ST = moment(new Date(getObj.startTime)).format("HH:mm:ss");
        var error_ET = moment(new Date(getObj.endTime)).format("HH:mm:ss");
        getObj.errorDate = error_date;
        getObj.errStartTime = error_ST;
        getObj.errEndTime = error_ET;
        $scope.machineErrorObj = getObj;
        $("#downtimeReportModalBox").modal("show");
    };

    $scope.partiMachineLogsObj = {};
    $scope.seletedSlotId = "";
    $scope.getLogsListWithPartiHr = function (getSelObj, getSelSlot) {
        $scope.mainLoaderIs = true;
        $scope.partiMachineLogsObj = getSelObj;
        var data = {
            "dateTime": $scope.filterData.date,
            "machine": getSelObj.machineName
        };
        $http({
            method: "POST",
            url: CONFIG.rootUrl + "rtServer/getDownUpErrorLogs",
            headers: {
                "Content-Type": "application/json"
            },
            data: data
        }).then(function (response) {
            var dwnTimeLogList = angular.copy(response.data);
            $scope.partiMachineLogsObj.err_date = moment(dwnTimeLogList[0].startTime).format("DD MMM, YYYY");
            $scope.seletedSlotId = getSelSlot.id;
            setTimeout(function () {
                $scope.seletedSlotId = "";
                $scope.$apply();
            }, 3000);

            var gettingErrorList = [];

            dwnTimeLogList.forEach((object, i) => {
                if (object.status == "downtime") {
                    object.err_str_time = moment(new Date(object.startTime)).format("hh:mm A");
                    object.err_end_time = moment(new Date(object.endTime)).format("hh:mm A");
                    object.errorTimeDuration = moment.utc(moment.duration(object.durationSecs, "seconds").asMilliseconds()).format("HH:mm:ss");
                    gettingErrorList.push(object);
                }
            });
            $scope.partiMachineLogsObj.downTimeLogs = gettingErrorList;
            console.log("dwnTimeLogList", $scope.partiMachineLogsObj);
            $scope.mainLoaderIs = false;
            $("#logsListModalBox").modal("show");
        }, function (error) {
            console.log("Error: ", error);
        });

    };
}]);
